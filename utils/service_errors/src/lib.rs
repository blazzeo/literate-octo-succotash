#[cfg(feature = "smtp")]
pub mod smtp;
#[cfg(feature = "smtp")]
use crate::smtp::SmtpError;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[cfg(feature = "sqlx")]
use sqlx;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Not Found: {0}")]
    NotFound(String),

    #[error("Conflict")]
    Conflict,

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("JWT error: {0}")]
    JWT(#[from] jsonwebtoken::errors::Error),

    #[error("Bad Request")]
    BadRequest,

    #[error("Forbidden")]
    Forbidden,

    #[error("Serialization/Deserialization Error: {0}")]
    SerdeJson(#[from] serde_json::Error),

    #[cfg(feature = "mongo")]
    #[error("Mongo error: ${0}")]
    Mongo(#[from] mongodb::error::Error),

    #[cfg(feature = "keycloak")]
    #[error("Keycloak error: {0}")]
    Keycloak(#[from] keycloak::KeycloakError),

    #[cfg(feature = "kafka")]
    #[error("Kafka error: {0}")]
    Kafka(#[from] rdkafka::error::KafkaError),

    #[cfg(feature = "smtp")]
    #[error("SMTP error: {0}")]
    Smtp(#[from] smtp::SmtpError),

    #[cfg(feature = "orm")]
    #[error("Database Connection Error: {0}")]
    DatabaseConnection(#[from] sea_orm::DbErr),

    #[cfg(feature = "sqlx")]
    #[error("SQLx Error: {0}")]
    Sqlx(#[from] sqlx::error::Error),
}

impl IntoResponse for ServiceError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, format!("Not Found: {}", msg)),
            Self::Conflict => (StatusCode::CONFLICT, "Conflict".to_string()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            Self::BadRequest => (StatusCode::BAD_REQUEST, "Bad Request".to_string()),
            Self::JWT(e) => (StatusCode::UNAUTHORIZED, format!("JWT error: {}", e)),
            Self::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".into()),
            Self::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Internal error: {}", msg),
            ),
            Self::SerdeJson(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Deserialization error: {:?}", e),
            ),
            #[cfg(feature = "mongo")]
            Self::Mongo(e) => (StatusCode::BAD_GATEWAY, format!("Mongo error: {}", e)),
            #[cfg(feature = "keycloak")]
            Self::Keycloak(e) => (StatusCode::BAD_GATEWAY, format!("Keycloak error: {}", e)),
            #[cfg(feature = "kafka")]
            Self::Kafka(e) => (StatusCode::BAD_GATEWAY, format!("Kafka error: {}", e)),
            #[cfg(feature = "smtp")]
            Self::Smtp(e) => {
                let msg = format!("{:?}", e);
                let status = match &e {
                    SmtpError::Lettre(_) => StatusCode::SERVICE_UNAVAILABLE,
                    SmtpError::Address(_) => StatusCode::NOT_FOUND,
                    SmtpError::Transport(_) => StatusCode::INTERNAL_SERVER_ERROR,
                    SmtpError::Response(_) => StatusCode::INTERNAL_SERVER_ERROR,
                };
                (status, msg)
            },
            #[cfg(feature = "orm")]
            Self::DatabaseConnection(e) => (
                StatusCode::SERVICE_UNAVAILABLE,
                format!("Service is unavailable: {}", e),
            ),
            #[cfg(feature = "sqlx")]
            Self::Sqlx(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Internal error: {}", msg),
            ),
        };

        let body = Json(serde_json::json!({
            "error": error_message,
        }));

        tracing::error!(error_message);

        (status, body).into_response()
    }
}
