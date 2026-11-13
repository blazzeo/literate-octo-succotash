mod services;
use crate::{config::AppState, entities::user::Model as UserInfo, router::UserIdParam};
use axum::{Json, extract::State};
use middleware::ClaimsExtension;
use service_error::ServiceError;
use std::sync::Arc;

pub async fn fetch_customer_profile(
    UserIdParam { user_id }: UserIdParam,
    State(state): State<Arc<AppState>>,
) -> Result<Json<UserInfo>, ServiceError> {
    let user = services::get_user_data(&user_id, &state.db_connection).await?;

    Ok(Json(user))
}

pub async fn update_customer_profile(
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
    Json(customer): Json<UserInfo>,
) -> Result<Json<bool>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;
    if customer.id.ne(&user_id) {
        return Err(ServiceError::Conflict);
    }

    let _ = services::update_user_data(&user_id, &customer, &state.db_connection).await?;

    Ok(Json(true))
}
