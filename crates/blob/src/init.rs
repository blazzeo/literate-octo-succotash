use crate::config::{AppConfig, AppState};
use clap::Parser;
use init_utils::{fetch_jwks, init_kafka_consumer};
use std::sync::Arc;

pub fn create_static_dir(uri: &str) {
    let _ = std::fs::create_dir_all(format!("{}/avatars", uri));
}

pub async fn init_app_state() -> Arc<AppState> {
    dotenv::dotenv().ok();

    let config = Arc::new(AppConfig::parse());
    let jwks = fetch_jwks(
        &config.keycloak_cfg.keycloak_url,
        &config.keycloak_cfg.keycloak_realm,
        &reqwest::Client::new(),
    )
    .await;
    let consumer = init_kafka_consumer(&config.kafka_url, "blob-consumer");

    //  Init AppState
    Arc::new(AppState {
        config,
        jwks: Arc::new(jwks),
        consumer: Arc::new(consumer),
    })
}
