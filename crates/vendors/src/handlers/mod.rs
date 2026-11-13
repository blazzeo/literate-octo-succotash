mod services;
use crate::{config::AppState, entities::user::Model as UserInfo, router::UserIdParam};
use axum::{Json, extract::State};
use middleware::ClaimsExtension;
use serde::Deserialize;
use service_error::ServiceError;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct UserId {
    pub id: String,
}

pub async fn fetch_vendor_profile(
    UserIdParam { user_id }: UserIdParam,
    State(state): State<Arc<AppState>>,
) -> Result<Json<UserInfo>, ServiceError> {
    let user = services::get_user_data(&user_id, &state.db_connection).await?;

    Ok(Json(user))
}

pub async fn update_vendor_profile(
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
    Json(vendor): Json<UserInfo>,
) -> Result<Json<bool>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;
    if vendor.id.ne(&user_id) {
        return Err(ServiceError::Conflict);
    }

    let _ = services::update_user_data(&user_id, &vendor, &state.db_connection).await?;

    Ok(Json(true))
}
