use rdkafka::{
    Message,
    consumer::{Consumer, StreamConsumer},
};
use serde::Deserialize;
use std::sync::Arc;

fn create_vendor_dir(
    static_dir: &str,
    vendor: &VendorPayload,
) {
    let _ = std::fs::create_dir_all(format!("{}/{}", static_dir, vendor.id));
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct CustomerPayload {
    id: String,
    username: String,
    email: String,
    first_name: String,
    last_name: String,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct VendorPayload {
    id: String,
    username: String,
    email: String,
}

pub async fn listen(
    client: Arc<StreamConsumer>,
    static_dir: String,
) {
    client
        .subscribe(&["customer-registered", "vendor-registered"])
        .expect("Kafka: Can't subscribe on topic");

    tracing::info!("consumer listen kafka topics");

    loop {
        match client.recv().await {
            Err(e) => {
                tracing::error!("Kafka error while receiving message: {}", e);
            },
            Ok(m) => {
                tracing::info!("Got event");

                let topic = m.topic();

                if let Some(payload) = m.payload() {
                    match topic {
                        "customer-registered" => {
                            match serde_json::from_slice::<CustomerPayload>(payload) {
                                Ok(_) => {
                                    tracing::info!("New customer");
                                },
                                Err(e) => {
                                    tracing::error!("Failed to deserialize CustomerPayload: {}", e);
                                },
                            }
                        },
                        "vendor-registered" => {
                            match serde_json::from_slice::<VendorPayload>(payload) {
                                Ok(vendor) => {
                                    tracing::info!("New vendor");
                                    create_vendor_dir(&static_dir, &vendor);
                                },
                                Err(e) => {
                                    tracing::error!("Failed to deserialize VendorPayload: {}", e);
                                },
                            }
                        },
                        _ => {
                            tracing::warn!("Received message from unexpected topic: {}", topic);
                        },
                    }
                } else {
                    tracing::warn!("Received Kafka message with empty payload");
                }
            },
        }
    }
}
