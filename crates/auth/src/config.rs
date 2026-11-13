use crate::{keycloak::types::CustomKeycloakAdminToken, redis::UserTokenRepository};
use clap::Parser;
use keycloak::KeycloakAdmin;
use middleware::types::JwksTrait;
use rdkafka::producer::FutureProducer;
use std::sync::Arc;

#[derive(Parser, Debug, Clone)]
pub struct SmtpConfig {
    #[arg(env = "SMTP_HOST")]
    pub smtp_host: String,
    #[arg(env = "SMTP_PORT")]
    pub smtp_port: String,
    #[arg(env = "SMTP_USER")]
    pub smtp_user: String,
    #[arg(env = "SMTP_PASS")]
    pub smtp_pass: String,
    #[arg(env = "SMTP_FROM_EMAIL")]
    pub smtp_from_email: String,
}

#[derive(Parser, Debug, Clone)]
pub struct KeycloakConfig {
    #[arg(env = "KEYCLOAK_BASE_URL")]
    pub url: String,

    #[arg(env = "KEYCLOAK_REALM")]
    pub realm: String,

    #[arg(env = "CLIENT_SECRET")]
    pub client_secret: String,
    #[arg(env = "CLIENT_ID")]
    pub client_id: String,

    #[arg(env = "ADMIN_USERNAME")]
    pub admin_name: String,
    #[arg(env = "ADMIN_PASSWORD")]
    pub admin_pass: String,

    #[arg(env = "REFRESH_AGE", default_value = "30", long = "refresh_token_age")]
    pub refresh_token_age_days: i64,
    #[arg(env = "ACCESS_AGE", default_value = "5", long = "access_token_age")]
    pub access_token_age_minutes: i64,
}

#[derive(Parser, Debug, Clone)]
pub struct KafkaConfig {
    #[arg(env = "KAFKA_BASE_URL")]
    pub kafka_url: String,
}

#[derive(Parser, Debug, Clone)]
#[command(version, about)]
pub struct AppConfig {
    #[arg(env = "HOST")]
    pub host: String,
    #[arg(env = "PORT")]
    pub port: String,
    #[arg(env = "SECRET_SIGNATURE")]
    pub signature: String,
    #[arg(env = "REDIS_URL")]
    pub redis_url: String,
    #[command(flatten)]
    pub frontend_domains: FrontendDomains,
    #[command(flatten)]
    pub keycloak_cfg: KeycloakConfig,
    #[command(flatten)]
    pub kafka_cfg: KafkaConfig,
    #[command(flatten)]
    pub smtp_cfg: SmtpConfig,
}

#[derive(Parser, Debug, Clone)]
pub struct FrontendDomains {
    #[arg(env = "DOMAIN")]
    pub domain: String,
    #[arg(env = "AUTH_FRONTEND_DOMAIN")]
    pub auth: String,
    #[arg(env = "CUSTOMER_FRONTEND_DOMAIN")]
    pub customer: String,
    #[arg(env = "VENDOR_FRONTEND_DOMAIN")]
    pub vendor: String,
    #[arg(env = "ADMIN_FRONTEND_DOMAIN")]
    pub admin: String,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub keycloak_admin: Arc<KeycloakAdmin<CustomKeycloakAdminToken>>,
    pub producer: Arc<FutureProducer>,
    pub jwks: Arc<middleware::types::Jwks>,
    pub client: Arc<reqwest::Client>,
    pub redis_repo: Arc<UserTokenRepository>,
}

impl JwksTrait for AppState {
    fn jwks(&self) -> Arc<middleware::types::Jwks> {
        self.jwks.clone()
    }
}
