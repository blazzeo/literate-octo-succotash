use crate::entities::{prelude::*, *};
use rdkafka::{
    Message,
    consumer::{Consumer, StreamConsumer},
};
use sea_orm::{ActiveValue::Set, DatabaseConnection, DbErr, EntityTrait};
use serde::Deserialize;
use std::sync::Arc;

async fn create_new_user(
    user: UserPayload,
    db: &DatabaseConnection,
) -> Result<(), DbErr> {
    let new_user = user::ActiveModel {
        id: Set(user.id),
        login: Set(user.username),
        email: Set(user.email),
        billing_address: Set(None),
        wallets: Set(None),
    };

    User::insert(new_user).exec(db).await?;

    Ok(())
}

async fn delete_user(
    user_id: &str,
    db: &DatabaseConnection,
) -> Result<(), DbErr> {
    User::delete_by_id(user_id).exec(db).await?;

    Ok(())
}

#[derive(Deserialize)]
struct UserPayload {
    id: String,
    username: String,
    email: String,
}

pub async fn listen(
    client: Arc<StreamConsumer>,
    db: Arc<DatabaseConnection>,
) {
    client
        .subscribe(&["vendor-registered", "vendor-deleted"])
        .expect("Kafka: Can't subscribe on topic");

    tracing::info!("consumer listen kafka topic");

    loop {
        match client.recv().await {
            Err(e) => {
                tracing::error!("Kafka error while receiving message: {}", e);
            },
            Ok(m) => {
                tracing::info!("Got event");
                match m.topic() {
                    "vendor-deleted" => {
                        if let Some(payload) = m.payload() {
                            if let Ok(user_id) = std::str::from_utf8(payload) {
                                match delete_user(user_id, &db).await {
                                    Ok(_) => tracing::info!("Vendor {} deleted", user_id),
                                    Err(e) => tracing::error!(
                                        "Failed to delete vendor {} from db: {:?}",
                                        user_id,
                                        e
                                    ),
                                }
                            } else {
                                tracing::error!("Invalid payload")
                            }
                        }
                    },
                    "vendor-registered" => {
                        if let Some(payload) = m.payload() {
                            match serde_json::from_slice::<UserPayload>(payload) {
                                Ok(user) => match create_new_user(user, &db).await {
                                    Ok(_) => tracing::info!("Vendor created in db"),
                                    Err(e) => {
                                        tracing::error!("Failed to create vendor in db: {:?}", e)
                                    },
                                },
                                Err(e) => {
                                    tracing::error!("Failed to deserialize Kafka message: {}", e);
                                },
                            }
                        } else {
                            tracing::warn!("Received Kafka message with empty payload");
                        }
                    },
                    _ => tracing::info!("Unknown topic"),
                }
            },
        }
    }
}
