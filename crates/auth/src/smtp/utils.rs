use crate::config::SmtpConfig;
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    transport::smtp::authentication::Credentials,
};
use service_error::{ServiceError, smtp::SmtpError};
use tracing::{error, info};

async fn send_email(
    config: &SmtpConfig,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), ServiceError> {
    info!("Preparing to send email to {}", to);

    let email = Message::builder()
        .from(config.smtp_from_email.parse().map_err(|e| {
            error!("Invalid from address: {}", e);
            ServiceError::Smtp(SmtpError::Address(e))
        })?)
        .to(to.parse().map_err(|e| {
            error!("Invalid recipient address: {}", e);
            SmtpError::Address(e)
        })?)
        .subject(subject)
        .body(body.to_string())
        .map_err(|e| {
            error!("Failed to build email message: {}", e);
            SmtpError::Lettre(e)
        })?;

    info!("Email message built successfully");

    let creds = Credentials::new(config.smtp_user.clone(), config.smtp_pass.clone());

    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay("smtp.mailersend.net")
        .map_err(|e| {
            error!("Failed to create SMTP transport: {}", e);
            SmtpError::Transport(e)
        })?
        .port(587)
        .credentials(creds)
        .build();

    info!("SMTP transport created. Sending email...");

    match mailer.send(email).await {
        Ok(_) => {
            info!("Email sent successfully to {}", to);
            Ok(())
        }
        Err(e) => {
            error!("Failed to send email: {}", e);
            Err(SmtpError::Transport(e).into())
        }
    }
}

pub async fn send_verification_email(
    config: SmtpConfig,
    to: &str,
    confirmation_link: &str,
) -> Result<(), ServiceError> {
    let message = format!("To activate your account click on the link below:\n{confirmation_link}");
    send_email(&config, to, "Email Verification", &message).await
}

pub async fn send_reset_email(
    config: &SmtpConfig,
    to: &str,
    reset_link: &str,
) -> Result<(), ServiceError> {
    let message =
        format!("To change password of your account click on the link below:\n{reset_link}");
    send_email(config, to, "Password Reset", &message).await
}
