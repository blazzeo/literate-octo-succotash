use auth::{config::SmtpConfig, smtp::utils::send_verification_email};
use dotenv;

#[tokio::test]
async fn test_email_send() {
    dotenv::dotenv().ok();

    let config = SmtpConfig {
        smtp_host: dotenv::var("SMTP_HOST").unwrap(),
        smtp_port: dotenv::var("SMTP_PORT").unwrap(),
        smtp_user: dotenv::var("SMTP_USER").unwrap(),
        smtp_pass: dotenv::var("SMTP_PASS").unwrap(),
        smtp_from_email: dotenv::var("SMTP_FROM_EMAIL").unwrap(),
    };

    let email_to = "blazzuka@gmail.com";

    let result = send_verification_email(config, email_to, "TEST").await;
    assert!(result.is_ok())
}
