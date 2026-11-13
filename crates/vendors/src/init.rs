use crate::{
    config::{self, AppState},
    init,
};
use clap::Parser;
use init_utils::{fetch_jwks, init_kafka_consumer};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use vendor_migration::{Migrator, MigratorTrait};

pub async fn init_db_connection(url: &str) -> Arc<DatabaseConnection> {
    match sea_orm::Database::connect(url).await {
        Ok(connection) => {
            if let Err(e) = Migrator::up(&connection, None).await {
                tracing::error!("Migration failed: {}", e);
            }
            Arc::new(connection)
        },
        Err(e) => {
            tracing::error!("Can't connect to database: {}", e);
            std::process::exit(1);
        },
    }
}

pub async fn init_app_state() -> Arc<AppState> {
    dotenv::dotenv().ok();
    let config = Arc::new(config::AppConfig::parse());
    let client = reqwest::Client::new();
    let jwks = fetch_jwks(
        &config.keycloak_cfg.keycloak_url,
        &config.keycloak_cfg.keycloak_realm,
        &client,
    )
    .await;
    let consumer = init_kafka_consumer(&config.kafka_url, "vendor-consumer");

    //  Init AppState
    Arc::new(AppState {
        config: Arc::clone(&config),
        jwks: Arc::new(jwks),
        consumer: Arc::new(consumer),
        db_connection: init::init_db_connection(&config.database_url).await,
    })
}
