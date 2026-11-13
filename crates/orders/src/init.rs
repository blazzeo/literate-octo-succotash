use crate::config::{AppConfig, AppState};
use clap::Parser;
use sqlx::{PgPool, error::BoxDynError, postgres::PgPoolOptions};
use std::sync::Arc;

pub async fn init_app_state() -> Arc<AppState> {
    dotenv::dotenv().ok();

    let config = Arc::new(AppConfig::parse());
    let client = reqwest::Client::new();

    let jwks = init_utils::fetch_jwks(
        &config.keycloak_cfg.keycloak_url,
        &config.keycloak_cfg.keycloak_realm,
        &client,
    )
    .await;

    let connection = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .expect("Can't establish connection with DB");

    let app_state = AppState {
        config: config.clone(),
        jwks: Arc::new(jwks),
        db_connection: Arc::new(connection),
    };

    Arc::new(app_state)
}

pub async fn init_db_tables(db_connection: &PgPool) -> Result<(), BoxDynError> {
    //  Extension pgcrypto (for uuid)
    sqlx::query("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        .execute(db_connection)
        .await?;

    //  Enum
    sqlx::query(
        "DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
                    CREATE TYPE order_status AS ENUM ('created', 'approved', 'paid', 'sold', 'cancelled', 'pending', 'delivered');
            END IF;
        END$$",
    )
    .execute(db_connection)
    .await?;

    //  Tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS Orders (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id varchar(36) NOT NULL,
            vendor_id varchar(36) NOT NULL,
            shipping_address varchar(50) NOT NULL,
            billing_address varchar(256) NOT NULL,
            status order_status NOT NULL
        )",
    )
    .execute(db_connection)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS OrderGoods (
            order_id uuid NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
            good_id varchar(36) NOT NULL,
            amount int NOT NULL,
            price_per_unit numeric(10, 2) NOT NULL
        )",
    )
    .execute(db_connection)
    .await?;

    Ok(())
}
