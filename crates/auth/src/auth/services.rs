use super::utils::{build_auth_cookies, remove_auth_cookies, validate_token};
use crate::{
    config::{FrontendDomains, KeycloakConfig},
    kafka::utils::delete_user_kafka,
    keycloak::{
        types::CustomKeycloakAdminToken,
        utils::{authenticate, get_user_by_email, get_user_type, logout_user, refresh_token},
    },
    registration::types::{UserCredentials, UserMe, UserType},
};
use axum_extra::extract::cookie::CookieJar;
use keycloak::KeycloakAdmin;
use middleware::types::Jwks;
use rdkafka::producer::FutureProducer;
use service_error::ServiceError;

pub async fn verify_access(
    cookies: CookieJar,
    jwks: &std::sync::Arc<Jwks>,
) -> Result<UserMe, ServiceError> {
    //  Get access token from cookie or err Unauthorized
    let access_token = cookies
        .get("access_token")
        .ok_or(ServiceError::Unauthorized)?;

    let claims = validate_token(access_token.value(), jwks)?;

    //  Parse JWT
    let id = claims
        .sub
        .ok_or_else(|| ServiceError::Internal("Claims doesn't sub".into()))?;

    let login = claims.preferred_username.ok_or_else(|| {
        ServiceError::Internal("Claims doesn't contain preferred_username".into())
    })?;

    let email = claims
        .email
        .ok_or_else(|| ServiceError::Internal("Claims doesn't contain email".into()))?;

    let role = claims
        .realm_access
        .as_ref()
        .and_then(|ra| {
            ra.roles
                .iter()
                .find(|r| ["admin", "customer", "vendor"].contains(&r.as_str()))
                .cloned()
        })
        .ok_or_else(|| ServiceError::Internal("Claims doesn't contain valid role".into()))?;

    let name = claims.name.unwrap_or_default();

    //  Construct response body
    let user = UserMe {
        id,
        name,
        login,
        email,
        role,
    };

    Ok(user)
}

pub async fn login(
    credentials: UserCredentials,
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
    frontend_domains: &FrontendDomains,
    client: &reqwest::Client,
) -> Result<(CookieJar, (UserType, String)), ServiceError> {
    //  Check user's credentials + Generate JWT
    let tokens = authenticate(&credentials, keycloak_cfg, client).await?;

    let user = get_user_by_email(admin, &credentials.email, &keycloak_cfg.realm).await?;

    let user_id = user
        .id
        .clone()
        .ok_or_else(|| ServiceError::Internal("User has no ID".into()))?;

    //  Find client's role (customer, vendor, admin)
    let user_type = get_user_type(admin, &user_id, &keycloak_cfg.realm).await?;

    //  Wrap JWTs in cookie
    //  Use the auth domain for cookies to ensure they work across subdomains
    let cookies = build_auth_cookies(
        tokens.access_token,
        tokens.refresh_token,
        &frontend_domains.auth,
        keycloak_cfg,
    );

    Ok((cookies, (user_type, user_id)))
}

pub async fn logout(
    mut cookies: CookieJar,
    keycloak_cfg: &KeycloakConfig,
    domain: &str,
    client: &reqwest::Client,
) -> Result<CookieJar, ServiceError> {
    //  Check for JWT in cookie
    let refresh_token_cookie = cookies
        .get("refresh_token")
        .ok_or_else(|| ServiceError::Unauthorized)?;

    //  Logout user using the refresh token string
    logout_user(refresh_token_cookie.value(), keycloak_cfg, client).await?;

    //  Remove tokens from cookie
    //  Use the auth domain for cookie removal
    let auth_domain = cookies
        .get("domain")
        .map(|c| c.value().to_string())
        .unwrap_or_else(|| domain.to_string());
    cookies = remove_auth_cookies(cookies, &auth_domain);

    Ok(cookies)
}

pub async fn refresh(
    mut cookies: CookieJar,
    keycloak_cfg: &KeycloakConfig,
    client: &reqwest::Client,
) -> Result<CookieJar, ServiceError> {
    // Check for old JWT in cookie
    let refresh_token_cookie = cookies
        .get("refresh_token")
        .ok_or_else(|| ServiceError::Unauthorized)?;

    //  Generate new JWT
    let new_tokens = refresh_token(refresh_token_cookie.value(), keycloak_cfg, client).await?;

    let domain = cookies
        .get("domain")
        .ok_or_else(|| ServiceError::BadRequest)?
        .value();

    //  Wrap new JWTs in cookie
    cookies = build_auth_cookies(
        new_tokens.access_token,
        new_tokens.refresh_token,
        domain,
        keycloak_cfg,
    );

    Ok(cookies)
}

pub async fn delete_user(
    user_id: &str,
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    keycloak_cfg: &KeycloakConfig,
    producer: &FutureProducer,
) -> Result<(), ServiceError> {
    //  Get user's type
    let user_type = get_user_type(admin, user_id, &keycloak_cfg.realm).await?;

    //  Delete user from keycloak
    let _ = admin
        .realm_users_with_user_id_delete(&keycloak_cfg.realm, user_id)
        .await?;

    //  Publish 'user_delete' event
    delete_user_kafka(user_id, user_type, producer).await?;

    Ok(())
}
