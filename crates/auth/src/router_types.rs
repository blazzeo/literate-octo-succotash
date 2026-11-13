use crate::registration::types::UserType;
use axum_extra::routing::TypedPath;
use serde::Deserialize;

#[derive(TypedPath, Deserialize)]
#[typed_path("/api/check_login/{login}")]
pub struct LoginPathParam {
    pub login: String,
}

#[derive(TypedPath, Deserialize)]
#[typed_path("/api/users/{id}")]
pub struct UserIdPathParam {
    pub id: String,
}

#[derive(TypedPath, Deserialize)]
#[typed_path("/api/check_email/{email}")]
pub struct UserTypeEmailPathParams {
    pub email: String,
}

#[derive(TypedPath, Deserialize)]
#[typed_path("/api/users/forgot_pass/{user_type}")]
pub struct UserTypePathParam {
    pub user_type: UserType,
}
