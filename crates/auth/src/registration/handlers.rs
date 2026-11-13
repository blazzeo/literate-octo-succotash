use super::{services, types::*};
use crate::{
    config::AppState,
    router_types::{LoginPathParam, UserTypeEmailPathParams, UserTypePathParam},
};
use axum::{
    Json,
    extract::{Query, State},
};
use middleware::ClaimsExtension;
use service_error::ServiceError;
use std::sync::Arc;

//  registers customer in keycloak
pub async fn register_customer(
    State(app_state): State<Arc<AppState>>,
    Json(customer_info): Json<CustomerInfo>,
) -> Result<String, ServiceError> {
    services::register_customer(
        customer_info,
        &app_state.redis_repo,
        &app_state.config.frontend_domains.auth,
        &app_state.config.smtp_cfg,
    )
    .await?;

    Ok("Customer registered".to_string())
}

//  registers vendor in keycloak
pub async fn register_vendor(
    State(app_state): State<Arc<AppState>>,
    Json(vendor_info): Json<VendorInfo>,
) -> Result<String, ServiceError> {
    services::register_vendor(
        vendor_info,
        &app_state.redis_repo,
        &app_state.config.frontend_domains.auth,
        &app_state.config.smtp_cfg,
    )
    .await?;

    Ok("Vendor registered".to_string())
}

//  registers vendor in keycloak
pub async fn register_admin(
    State(app_state): State<Arc<AppState>>,
    Json(admin_info): Json<AdminInfo>,
) -> Result<String, ServiceError> {
    services::register_admin(
        admin_info,
        &app_state.redis_repo,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
        &app_state.producer,
    )
    .await?;

    Ok("Vendor registered".to_string())
}

//  Verify user's email
//  and publishes message to kafka topic 'vendor[customer]-registered',
//  that vendor/customer created an account
pub async fn verify_email(
    State(app_state): State<Arc<AppState>>,
    Query(params): Query<VerifyTokenParams>,
) -> Result<Json<bool>, ServiceError> {
    services::verify_email(
        &params.token,
        &app_state.redis_repo,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
        &app_state.producer,
    )
    .await?;

    Ok(Json(true))
}

//  Endpoint to send reset_password link with token on email
pub async fn forgot_password(
    UserTypePathParam { user_type }: UserTypePathParam,
    State(app_state): State<Arc<AppState>>,
    Json(email): Json<EmailJson>,
) -> Result<Json<bool>, ServiceError> {
    let domain = match user_type {
        UserType::Customer => &app_state.config.frontend_domains.customer,
        UserType::Vendor => &app_state.config.frontend_domains.vendor,
        UserType::Admin => &app_state.config.frontend_domains.admin,
    };

    services::forget_password(
        &email.email,
        &app_state.redis_repo,
        domain,
        &app_state.config.smtp_cfg,
    )
    .await?;

    Ok(Json(true))
}

//  Endpoint to actually reset user's password
pub async fn reset_password(
    State(app_state): State<Arc<AppState>>,
    Query(params): Query<VerifyTokenParams>,
    Json(new_password): Json<NewPasswordJson>,
) -> Result<Json<bool>, ServiceError> {
    services::reset_password(
        &params.token,
        new_password.new_password,
        &app_state.redis_repo,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
    )
    .await?;

    Ok(Json(true))
}

//  Endpoint to check available email
pub async fn check_email(
    UserTypeEmailPathParams { email }: UserTypeEmailPathParams,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<bool>, ServiceError> {
    let is_available = services::check_available_email(
        &email,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
    )
    .await?;

    Ok(Json(is_available))
}

//  Endpoint to check available login
pub async fn check_login(
    LoginPathParam { login }: LoginPathParam,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<bool>, ServiceError> {
    let is_available = services::check_available_login(
        &login,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
    )
    .await?;

    Ok(Json(is_available))
}

//  Endpoint to deactivate user
pub async fn deactivate_user(
    State(app_state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
) -> Result<(), ServiceError> {
    let user_id = claims.sub.ok_or(ServiceError::Unauthorized)?;

    services::deactivate_user(
        &user_id,
        &app_state.keycloak_admin,
        &app_state.config.keycloak_cfg,
    )
    .await?;

    Ok(())
}
