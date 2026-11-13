use thiserror::Error;
use tracing::error;

#[derive(Debug, Error)]
pub enum SmtpError {
    #[error("SMTP general error: {0}")]
    Lettre(#[from] lettre::error::Error),

    #[error("SMTP address error: {0}")]
    Address(#[from] lettre::address::AddressError),

    #[error("SMTP transport error: {0}")]
    Transport(#[from] lettre::transport::smtp::Error),

    #[error("SMTP response error")]
    Response(lettre::transport::smtp::response::Response),
}
