use crate::{
    config::{AppConfig, AppState, KeycloakConfig},
    keycloak::{types::CustomKeycloakAdminToken, utils::get_admin_token},
    redis::UserTokenRepository,
};
use clap::Parser;
use init_utils::fetch_jwks;
use keycloak::KeycloakAdmin;
use rdkafka::{
    ClientConfig,
    admin::{AdminClient, AdminOptions, NewTopic, TopicReplication},
    client::DefaultClientContext,
    producer::FutureProducer,
    types::RDKafkaErrorCode,
};
use reqwest::Client;
use std::sync::Arc;
use tracing::{error, info};

pub async fn init_kafka(url: &str) -> Arc<FutureProducer> {
    let client = match ClientConfig::new().set("bootstrap.servers", url).create() {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to create kafka producer: {}", e);
            std::process::exit(1);
        },
    };

    let admin: AdminClient<DefaultClientContext> =
        match ClientConfig::new().set("bootstrap.servers", url).create() {
            Ok(config) => config,
            Err(e) => {
                error!("Failed to create kafka producer: {}", e);
                std::process::exit(1);
            },
        };

    let customer_topic = NewTopic::new("customer-registered", 3, TopicReplication::Fixed(1));
    let vendor_topic = NewTopic::new("vendor-registered", 3, TopicReplication::Fixed(1));

    let res = admin
        .create_topics(&[customer_topic, vendor_topic], &AdminOptions::new())
        .await;

    match res {
        Ok(results) => {
            for result in results {
                match result {
                    Ok(topic) => info!("Topic '{}' created", topic),
                    Err((topic, err)) => {
                        if err == RDKafkaErrorCode::TopicAlreadyExists {
                            info!("Topic '{}' is already created", topic);
                        } else {
                            error!("Error creating topic '{}': {:?}", topic, err);
                            std::process::exit(1);
                        }
                    },
                }
            }
        },
        Err(e) => error!("Error: {:?}", e),
    }

    Arc::new(client)
}

pub fn init_redis(url: &str) -> Arc<UserTokenRepository> {
    Arc::new(UserTokenRepository::new(url))
}

pub async fn init_keycloak_admin(
    realm: &str,
    secret: &str,
    config: &KeycloakConfig,
    client: &Client,
) -> Arc<KeycloakAdmin<CustomKeycloakAdminToken>> {
    // Fetch the admin token from Keycloak using provided credentials
    let admin_token = get_admin_token(
        &config.admin_name,
        &config.admin_pass,
        realm,
        &config.client_id,
        secret,
        client.clone(),
    );

    Arc::new(KeycloakAdmin::<CustomKeycloakAdminToken>::new(
        &config.url,
        admin_token,
        client.clone(),
    ))
}

pub async fn init_app_state() -> Arc<AppState> {
    dotenv::dotenv().ok();
    let config = Arc::new(AppConfig::parse());

    //  Init AppState
    let client = Arc::new(reqwest::Client::new());
    let redis_repo = init_redis(&config.redis_url);
    let producer = init_kafka(&config.kafka_cfg.kafka_url).await;
    //  Keycloak admins init
    let keycloak_admin = init_keycloak_admin(
        &config.keycloak_cfg.realm,
        &config.keycloak_cfg.client_secret,
        &config.keycloak_cfg,
        &client,
    )
    .await;

    let jwks = Arc::new(
        fetch_jwks(
            &config.keycloak_cfg.url,
            &config.keycloak_cfg.realm,
            &client,
        )
        .await,
    );

    Arc::new(AppState {
        config,
        keycloak_admin,
        producer,
        jwks,
        client,
        redis_repo,
    })
}
