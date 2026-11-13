use clap::Parser;
use middleware::types::{Jwks, JwksTrait};
use rdkafka::consumer::StreamConsumer;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

#[derive(Parser, Debug, Clone)]
pub struct AppConfig {
    #[arg(env = "HOST")]
    pub host: String,
    #[arg(env = "PORT")]
    pub port: String,
    #[arg(env = "FRONTEND_DOMAIN")]
    pub frontend_domain: String,
    #[arg(env = "CUSTOMER_CLIENT_DOMAIN")]
    pub customer_client_domain: String,
    #[arg(env = "AUTH_API_DOMAIN")]
    pub auth_api_domain: String,
    #[arg(env = "DATABASE_URL")]
    pub database_url: String,
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
    pub db_connection: Arc<DatabaseConnection>,
}

impl JwksTrait for AppState {
    fn jwks(&self) -> std::sync::Arc<Jwks> {
        self.jwks.clone()
    }
}
