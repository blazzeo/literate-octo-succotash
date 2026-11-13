use rdkafka::producer::{FutureProducer, FutureRecord};
use service_error::ServiceError;
use tokio::time::Duration;

use crate::registration::types::UserType;

async fn publish_message(
    producer: &FutureProducer,
    topic: &str,
    key: &str,
    payload: &str,
) -> Result<(), ServiceError> {
    producer
        .send(
            FutureRecord::to(topic).payload(payload).key(key),
            Duration::from_secs(5),
        )
        .await
        .map_err(|(err, _)| ServiceError::Kafka(err))?;

    Ok(())
}

pub async fn delete_user_kafka(
    id: &str,
    user_type: UserType,
    producer: &FutureProducer,
) -> Result<(), ServiceError> {
    let payload = serde_json::to_string(id)?;
    let msg = match user_type {
        UserType::Customer => "customer-deleted",
        UserType::Vendor => "vendor-deleted",
        UserType::Admin => "admin-deleted",
    };

    publish_message(producer, msg, "key1", &payload).await?;

    Ok(())
}

pub async fn register_vendor(
    id: &str,
    username: &str,
    email: &str,
    producer: &FutureProducer,
) -> Result<(), ServiceError> {
    let user = super::VendorPayload {
        id: id.to_string(),
        username: username.to_string(),
        email: email.to_string(),
    };

    let payload = serde_json::to_string(&user)?;

    publish_message(producer, "vendor-registered", "key1", &payload).await?;

    Ok(())
}

pub async fn register_customer(
    id: &str,
    username: &str,
    email: &str,
    first_name: &str,
    last_name: &str,
    producer: &FutureProducer,
) -> Result<(), ServiceError> {
    let user = super::CustomerPayload {
        id: id.to_string(),
        username: username.to_string(),
        email: email.to_string(),
        first_name: first_name.to_string(),
        last_name: last_name.to_string(),
    };

    let payload = serde_json::to_string(&user)?;

    publish_message(producer, "customer-registered", "key1", &payload).await?;

    Ok(())
}

pub async fn register_admin(
    id: &str,
    username: &str,
    email: &str,
    producer: &FutureProducer,
) -> Result<(), ServiceError> {
    let user = super::VendorPayload {
        id: id.to_string(),
        username: username.to_string(),
        email: email.to_string(),
    };

    let payload = serde_json::to_string(&user)?;

    publish_message(producer, "admin-registered", "key1", &payload).await?;

    Ok(())
}
