use crate::{
    auth::services,
    config::AppState,
    registration::types::{UserCredentials, UserMe, UserType},
    router_types::UserIdPathParam,
};
use axum::{Form, Json, extract::State};
use axum_extra::extract::cookie::CookieJar;
use serde::Serialize;
use service_error::ServiceError;
use std::sync::Arc;

//  check JWT
pub async fn verify_access(
    cookies: CookieJar,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<UserMe>, ServiceError> {
    let user = services::verify_access(cookies, &app_state.jwks).await?;

    Ok(Json(user))
}

//  delete user by id
pub async fn delete_user(
    UserIdPathParam { id }: UserIdPathParam,
    State(app_state): State<Arc<AppState>>,
) -> Result<(), ServiceError> {
    services::delete_user(
        &id,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
        &app_state.producer,
    )
    .await?;

    Ok(())
}

#[derive(Serialize)]
pub struct UserTypeId {
    pub user_type: UserType,
    pub user_id: String,
}

//  authorizes user and returns JWT and refresh token
pub async fn login(
    State(app_state): State<Arc<AppState>>,
    Form(credentials): Form<UserCredentials>,
) -> Result<(CookieJar, String), ServiceError> {
    let (cookies, (user_type, _user_id)) = services::login(
        credentials,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
        &app_state.config.frontend_domains,
        &app_state.client,
    )
    .await?;

    let redirect_url = match user_type {
        UserType::Customer => &app_state.config.frontend_domains.customer,
        UserType::Vendor => &app_state.config.frontend_domains.vendor,
        UserType::Admin => &app_state.config.frontend_domains.admin,
    };

    Ok((cookies, redirect_url.to_string()))
}

//  logout user
pub async fn logout(
    cookies: CookieJar,
    State(app_state): State<Arc<AppState>>,
) -> Result<CookieJar, ServiceError> {
    let cookies = services::logout(
        cookies,
        &app_state.config.keycloak_cfg,
        &app_state.config.frontend_domains.domain,
        &app_state.client,
    )
    .await?;

    Ok(cookies)
}

//  refreshes user's JWT token
pub async fn refresh(
    cookies: CookieJar,
    State(app_state): State<Arc<AppState>>,
) -> Result<CookieJar, ServiceError> {
    let cookies =
        services::refresh(cookies, &app_state.config.keycloak_cfg, &app_state.client).await?;

    Ok(cookies)
}
