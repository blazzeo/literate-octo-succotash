use super::types::{CustomKeycloakAdminToken, Jwks, KeycloakAdminClientConfig, TokenResponse};
use crate::{
    config::KeycloakConfig,
    registration::types::{UserCredentials, UserInfo, UserInfoEnum, UserType},
};
use async_trait::async_trait;
use keycloak::{
    KeycloakAdmin, KeycloakError, KeycloakTokenSupplier,
    types::{CredentialRepresentation, UserRepresentation},
};
use service_error::ServiceError;
use std::collections::HashMap;
use tracing::error;

#[async_trait]
impl KeycloakTokenSupplier for CustomKeycloakAdminToken {
    async fn get(
        &self,
        url: &str,
    ) -> Result<String, KeycloakError> {
        let url = format!(
            "{}/realms/{}/protocol/openid-connect/token",
            url, &self.config.realm
        );

        let params = [
            ("client_id", self.config.client_id.clone()),
            ("client_secret", self.config.client_secret.clone()),
            ("username", self.config.username.clone()),
            ("password", self.config.password.clone()),
            ("grant_type", "password".to_string()),
        ];

        let res = match self
            .client
            .post(url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&params)
            .send()
            .await
        {
            Ok(result) => result,
            Err(e) => {
                error!("Error getting KeyCloakAdmin: {}", e);
                std::process::exit(1);
            },
        };

        if !res.status().is_success() {
            error!("Failed to get token");
        }

        let token_response: TokenResponse = res.json().await?;

        Ok(token_response.access_token)
    }
}

pub fn get_admin_token(
    username: &str,
    password: &str,
    realm: &str,
    client_id: &str,
    secret: &str,
    client: reqwest::Client,
) -> CustomKeycloakAdminToken {
    let config = KeycloakAdminClientConfig {
        client_id: client_id.into(),
        realm: realm.into(),
        username: username.into(),
        password: password.into(),
        client_secret: secret.into(),
    };

    CustomKeycloakAdminToken {
        config,
        client: client.clone(),
    }
}

pub async fn get_user_type(
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    user_id: &str,
    realm: &str,
) -> Result<UserType, ServiceError> {
    let roles = admin
        .realm_users_with_user_id_role_mappings_realm_get(realm, user_id)
        .await?;

    if let Some(user_type) = roles
        .iter()
        .filter_map(|r| r.name.as_deref()?.parse::<UserType>().ok())
        .next()
    {
        Ok(user_type)
    } else {
        Err(ServiceError::NotFound("User role not found".into()))
    }
}

pub async fn get_user_by_id(
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    user_id: &str,
    realm: &str,
) -> Result<UserRepresentation, ServiceError> {
    let user = admin
        .realm_users_with_user_id_get(realm, user_id, None)
        .await?;

    Ok(user)
}

pub async fn get_user_by_email(
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    email: &str,
    realm: &str,
) -> Result<UserRepresentation, ServiceError> {
    let users = admin
        .realm_users_get(
            realm,
            None,
            Some(email.into()),
            None,
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
            None,
        )
        .await
        .map_err(ServiceError::Keycloak)?;

    users
        .into_iter()
        .find(|u| u.email.as_deref() == Some(email))
        .ok_or_else(|| ServiceError::NotFound("User not found".into()))
}

type UserId = String;
//  Returns new User's id
pub async fn register_user(
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    user_info: &UserInfoEnum,
    realm: &str,
) -> Result<UserId, ServiceError> {
    let user = UserRepresentation {
        username: Some(user_info.username().to_string()),
        email: Some(user_info.credentials().email.clone()),
        first_name: user_info.first_name().clone(),
        last_name: user_info.last_name().clone(),
        realm_roles: Some(user_info.roles()),
        enabled: Some(true),
        ..Default::default()
    };

    // Create new user
    admin
        .realm_users_post(realm, user)
        .await
        .map_err(ServiceError::Keycloak)?;

    // Get user by email
    let user = get_user_by_email(admin, &user_info.credentials().email, realm).await?;

    // Get user's id
    let user_id = &user
        .id
        .ok_or_else(|| ServiceError::Internal("User don't have ID".into()))?;

    let all_roles = admin.realm_roles_get(realm, None, None, None, None).await?;
    let user_role = all_roles
        .into_iter()
        .find(|r| r.name.as_deref() == Some(user_info.user_type().to_str()))
        .ok_or_else(|| ServiceError::Internal("Role 'customer' or 'vendor' not found".into()))?;

    tracing::debug!("User_Role Found: {:?}", user_role);

    //  Assign role to user
    admin
        .realm_users_with_user_id_role_mappings_realm_post(realm, user_id, vec![user_role])
        .await?;

    // Set new password
    admin
        .realm_users_with_user_id_reset_password_put(
            realm,
            user_id,
            CredentialRepresentation {
                type_: Some("password".into()),
                value: Some(user_info.credentials().password.clone()),
                temporary: Some(false),
                ..Default::default()
            },
        )
        .await?;

    Ok(user_id.into())
}

pub async fn authenticate(
    credentials: &UserCredentials,
    config: &KeycloakConfig,
    client: &reqwest::Client,
) -> Result<TokenResponse, ServiceError> {
    let url = format!(
        "{}/realms/{}/protocol/openid-connect/token",
        config.url, config.realm
    );

    let params = HashMap::from([
        ("grant_type", "password"),
        ("client_id", &config.client_id),
        ("username", &credentials.email),
        ("password", &credentials.password),
        ("client_secret", &config.client_secret),
    ]);

    let response = client
        .post(url)
        .form(&params)
        .send()
        .await
        .map_err(|e| ServiceError::Internal(format!("Request invalid: {}", e)))?;

    if response.status().is_success() {
        response
            .json::<TokenResponse>()
            .await
            .map_err(|e| ServiceError::Internal(format!("Error reading JSON: {}", e)))
    } else {
        Err(ServiceError::Unauthorized)
    }
}

pub async fn logout_user(
    refresh_token: &str,
    config: &KeycloakConfig,
    client: &reqwest::Client,
) -> Result<(), ServiceError> {
    let url = format!(
        "{}/realms/{}/protocol/openid-connect/logout",
        config.url, config.realm
    );

    let params = HashMap::from([
        ("client_id", config.client_id.clone()),
        ("client_secret", config.client_secret.clone()),
        ("refresh_token", refresh_token.into()),
    ]);

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| ServiceError::Internal(format!("Logout request failed: {}", e)))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let err_msg = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".into());
        Err(ServiceError::Internal(format!(
            "Logout failed: {}",
            err_msg
        )))
    }
}

pub async fn refresh_token(
    refresh_token: &str,
    keycloak_cfg: &KeycloakConfig,
    client: &reqwest::Client,
) -> Result<TokenResponse, ServiceError> {
    let url = format!(
        "{}/realms/{}/protocol/openid-connect/token",
        keycloak_cfg.url, keycloak_cfg.realm
    );

    let params = HashMap::from([
        ("client_id", keycloak_cfg.client_id.as_str()),
        ("client_secret", keycloak_cfg.client_secret.as_str()),
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
    ]);

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| ServiceError::Internal(format!("Refresh request failed: {}", e)))?;

    if response.status().is_success() {
        let token = response
            .json()
            .await
            .map_err(|e| ServiceError::Internal(format!("Error reading JSON: {}", e)))?;
        Ok(token)
    } else {
        let err_msg = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".into());
        Err(ServiceError::Internal(format!(
            "Refresh failed: {}",
            err_msg
        )))
    }
}

pub async fn fetch_jwks(
    config: &KeycloakConfig,
    client: &reqwest::Client,
) -> Result<Jwks, reqwest::Error> {
    let url = format!(
        "{}/realms/{}/protocol/openid-connect/certs",
        config.url, config.realm
    );
    let res = client.get(&url).send().await?;
    let jwks = res.json::<Jwks>().await?;
    Ok(jwks)
}

pub async fn mark_user_verified(
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    email: &str,
    cfg: &KeycloakConfig,
) -> Result<(), ServiceError> {
    let mut user = get_user_by_email(admin, email, &cfg.realm).await?;

    let user_id = user
        .id
        .clone()
        .ok_or_else(|| ServiceError::Internal("User has no ID".into()))?;

    user.email_verified = Some(true);

    admin
        .realm_users_with_user_id_put(&cfg.realm, &user_id, user)
        .await
        .map_err(ServiceError::Keycloak)?;

    Ok(())
}

pub async fn reset_user_password(
    new_password: String,
    admin: &KeycloakAdmin<CustomKeycloakAdminToken>,
    email: &str,
    cfg: &KeycloakConfig,
) -> Result<(), ServiceError> {
    let user = get_user_by_email(admin, email, &cfg.realm).await?;

    let user_id = user
        .id
        .clone()
        .ok_or_else(|| ServiceError::Internal("User has no ID".into()))?;

    // Set new password
    admin
        .realm_users_with_user_id_reset_password_put(
            &cfg.realm,
            &user_id,
            CredentialRepresentation {
                type_: Some("password".into()),
                value: Some(new_password),
                temporary: Some(false),
                ..Default::default()
            },
        )
        .await?;

    Ok(())
}
