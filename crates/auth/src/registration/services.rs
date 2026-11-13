use crate::{
    config::{KeycloakConfig, SmtpConfig},
    kafka,
    keycloak::{
        types::CustomKeycloakAdminToken,
        utils::{get_user_by_id, mark_user_verified, register_user, reset_user_password},
    },
    redis::UserTokenRepository,
    registration::types::{
        AdminInfo, CustomerInfo, UserInfo, UserInfoEnum, UserType, UserVerificationParams,
        VendorInfo,
    },
    smtp::utils::{send_reset_email, send_verification_email},
};
use keycloak::KeycloakAdmin;
use rdkafka::producer::FutureProducer;
use service_error::ServiceError;
use uuid::Uuid;

pub async fn register_customer(
    customer_info: CustomerInfo,
    redis_repo: &UserTokenRepository,
    frontend_domain: &str,
    smtp_cfg: &SmtpConfig,
) -> Result<bool, ServiceError> {
    //  Generate confirmation token
    let token = Uuid::new_v4().to_string();
    let email = customer_info.credentials().email.clone();

    let user_params = UserVerificationParams {
        user_info: UserInfoEnum::Customer(customer_info),
    };

    //  Store user_info + confirmation token in redis
    redis_repo.save_token(user_params, &token, 1).await?;

    let confirmation_link = format!("{}/verify-email?token={}", frontend_domain, token);

    send_verification_email(smtp_cfg.clone(), &email, &confirmation_link).await?;

    Ok(true)
}

pub async fn register_vendor(
    vendor_info: VendorInfo,
    redis_repo: &UserTokenRepository,
    frontend_domain: &str,
    smtp_cfg: &SmtpConfig,
) -> Result<bool, ServiceError> {
    //  Generate confirmation token
    let token = Uuid::new_v4().to_string();
    let email = vendor_info.credentials().email.clone();

    let user_params = UserVerificationParams {
        user_info: UserInfoEnum::Vendor(vendor_info),
    };

    //  Store confirmation token in redis
    redis_repo.save_token(user_params, &token, 1).await?;

    let confirmation_link = format!("{}/verify-email?token={}", frontend_domain, token);

    send_verification_email(smtp_cfg.clone(), &email, &confirmation_link).await?;

    Ok(true)
}

pub async fn register_admin(
    admin_info: AdminInfo,
    redis_repo: &UserTokenRepository,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
    kafka_producer: &FutureProducer,
) -> Result<bool, ServiceError> {
    let user_params = UserVerificationParams {
        user_info: UserInfoEnum::Admin(admin_info),
    };

    //  Store confirmation token in redis
    redis_repo.save_token(user_params, "admin", 1).await?;

    let result = verify_email(
        "admin",
        redis_repo,
        keycloak_admin,
        keycloak_cfg,
        kafka_producer,
    )
    .await?;

    Ok(result)
}

pub async fn verify_email(
    token: &str,
    redis_repo: &UserTokenRepository,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
    kafka_producer: &FutureProducer,
) -> Result<bool, ServiceError> {
    //  Try to verify token + get UserParams
    let redis_result = redis_repo
        .verify_token::<UserVerificationParams>(token)
        .await?;

    let user_info = redis_result.user_info;

    //  Register User
    let user_id = register_user(keycloak_admin, &user_info, &keycloak_cfg.realm).await?;

    //  Delete User
    redis_repo.delete_token(token).await?;

    //  Verify User
    mark_user_verified(keycloak_admin, &user_info.credentials().email, keycloak_cfg).await?;

    //  Publish Message to Kafka
    match user_info.user_type() {
        UserType::Vendor => {
            kafka::utils::register_vendor(
                &user_id,
                user_info.username(),
                &user_info.credentials().email,
                kafka_producer,
            )
            .await?
        },
        UserType::Customer => {
            kafka::utils::register_customer(
                &user_id,
                user_info.username(),
                &user_info.credentials().email,
                user_info.first_name().as_ref().unwrap(),
                user_info.last_name().as_ref().unwrap(),
                kafka_producer,
            )
            .await?
        },
        UserType::Admin => {
            kafka::utils::register_admin(
                &user_id,
                user_info.username(),
                &user_info.credentials().email,
                kafka_producer,
            )
            .await?
        },
    }

    Ok(true)
}

pub async fn forget_password(
    email: &str,
    redis_repo: &UserTokenRepository,
    frontend_domain: &str,
    smtp_cfg: &SmtpConfig,
) -> Result<bool, ServiceError> {
    //  Generate confirmation token
    let token = Uuid::new_v4().to_string();

    //  Store Token + Email in redis
    redis_repo.save_token(&email, &token, 1).await?;

    let reset_link = format!("{}/reset-password?token={}", frontend_domain, token);

    send_reset_email(smtp_cfg, email, &reset_link).await?;

    Ok(true)
}

pub async fn reset_password(
    token: &str,
    new_password: String,
    redis_repo: &UserTokenRepository,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
) -> Result<bool, ServiceError> {
    // Check Token +
    // Get Params from redis
    let redis_result = redis_repo.verify_token::<String>(token).await?;

    redis_repo.delete_token(token).await?;

    //  Reset user's password
    reset_user_password(new_password, keycloak_admin, &redis_result, keycloak_cfg).await?;

    Ok(true)
}

pub async fn check_available_email(
    email: &str,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
) -> Result<bool, ServiceError> {
    //  Get all user's with email
    let users = keycloak_admin
        .realm_users_get(
            &keycloak_cfg.realm,
            None,
            Some(email.into()),
            Some(true),
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .map_err(ServiceError::Keycloak)?;

    //  No user was found -> email is free
    Ok(users.is_empty())
}

pub async fn check_available_login(
    login: &str,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
) -> Result<bool, ServiceError> {
    //  Get all user's with login
    let users = keycloak_admin
        .realm_users_get(
            &keycloak_cfg.realm,
            None,
            None,
            Some(true),
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            Some(login.into()),
        )
        .await;
    // .map_err(ServiceError::Keycloak)?;

    match users {
        Ok(users) => Ok(users.is_empty()),
        Err(e) => {
            eprintln!("DEBUG: {:?}", e);
            Err(ServiceError::Keycloak(e))
        },
    }

    //  No user was found -> login is free
    //  Otherwise -> login is busy
    // Ok(users.is_empty())
}

pub async fn deactivate_user(
    user_id: &str,
    keycloak_admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
) -> Result<(), ServiceError> {
    let mut user = get_user_by_id(keycloak_admin, user_id, &keycloak_cfg.realm).await?;

    user.enabled = Some(false);

    keycloak_admin
        .realm_users_with_user_id_put(&keycloak_cfg.realm, user_id, user)
        .await?;

    Ok(())
}
