use crate::{config::AppState, types::Manifest};
use axum::{
    Json,
    extract::{Multipart, Path, State},
    response::Response,
};
use middleware::ClaimsExtension;
use service_error::ServiceError;
use std::sync::Arc;
mod services;

pub async fn upload_file(
    Path(file_path): Path<String>,
    State(app_state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
    multipart: Multipart,
) -> Result<Json<bool>, ServiceError> {
    let user_id = claims.sub.ok_or(ServiceError::BadRequest)?;

    services::upload_file(&app_state.config.static_dir, file_path, user_id, multipart).await?;

    Ok(Json(true))
}

pub async fn delete_file(
    Path(file_path): Path<String>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<bool>, ServiceError> {
    services::delete_file(&app_state.config.static_dir, file_path).await?;

    Ok(Json(true))
}

pub async fn read_file(
    Path(file_path): Path<String>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Response, ServiceError> {
    let res = services::read_file(&app_state.config.static_dir, file_path).await?;

    Ok(res)
}

pub async fn get_info(
    Path((user_id, good_id)): Path<(String, String)>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<Manifest>, ServiceError> {
    let file_path = format!("{}/{}", user_id, good_id);

    let manifest_str = services::get_manifest(&app_state.config.static_dir, file_path).await?;

    let manifest_json: Manifest =
        serde_json::from_str(&manifest_str).map_err(ServiceError::SerdeJson)?;

    Ok(Json(manifest_json))
}

pub async fn update_files(
    Path(file_path): Path<String>,
    State(app_state): State<Arc<AppState>>,
    multipart: Multipart,
) -> Result<Json<bool>, ServiceError> {
    services::update_files(&app_state.config.static_dir, file_path, multipart).await?;

    Ok(Json(true))
}
