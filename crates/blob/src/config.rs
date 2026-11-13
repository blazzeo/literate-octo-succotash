use clap::Parser;
use middleware::types::{Jwks, JwksTrait};
use rdkafka::consumer::StreamConsumer;
use std::sync::Arc;

#[derive(Parser, Debug, Clone)]
pub struct AppConfig {
    #[arg(env = "HOST")]
    pub host: String,
    #[arg(env = "PORT")]
    pub port: String,
    #[arg(env = "STATIC_DIR")]
    pub static_dir: String,
    #[arg(env = "AUTH_FRONTEND_DOMAIN")]
    pub auth_frontend_domain: String,
    #[arg(env = "VENDOR_FRONTEND_DOMAIN")]
    pub vendor_frontend_domain: String,
    #[arg(env = "CUSTOMER_FRONTEND_DOMAIN")]
    pub customer_frontend_domain: String,
    #[arg(env = "KAFKA_BASE_URL")]
    pub kafka_url: String,
    #[command(flatten)]
    pub keycloak_cfg: KeycloakConfig,
}

#[derive(Debug, Parser, Clone)]
pub struct KeycloakConfig {
    #[arg(env = "KEYCLOAK_BASE_URL")]
    pub keycloak_url: String,
    #[arg(env = "KEYCLOAK_REALM")]
    pub keycloak_realm: String,
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub jwks: Arc<Jwks>,
    pub consumer: Arc<StreamConsumer>,
}

impl JwksTrait for AppState {
    fn jwks(&self) -> Arc<Jwks> {
        self.jwks.clone()
    }
}
