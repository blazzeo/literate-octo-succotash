use alloy::{
    self,
    eips::BlockNumberOrTag,
    primitives::Log,
    providers::{Provider, ProviderBuilder},
    rpc::types::Filter,
    sol_types::SolEvent,
};

use alloy::sol;
use tracing::info;
use uuid::Uuid;

use crate::sqlx_utils::{self, types::OrderStatus};

fn bytes16_to_uuid(bytes: [u8; 16]) -> Result<Uuid, Box<dyn std::error::Error>> {
    Ok(Uuid::from_bytes(bytes))
}

sol! {
    event GlobalOrderEvent(
        bytes16 indexed vendorId,
        bytes16 indexed orderId,
        bytes16 indexed customerId,
        uint8 eventType,
        address orderAddress
    );
}

#[derive(Debug)]
enum EventType {
    Created,
    Approved,
    Paid,
    Sold,
    Delivered,
    Cancelled,
    Undefined,
}

impl From<u8> for EventType {
    fn from(v: u8) -> Self {
        match v {
            0 => EventType::Created,
            1 => EventType::Approved,
            2 => EventType::Paid,
            3 => EventType::Sold,
            4 => EventType::Delivered,
            5 => EventType::Cancelled,
            _ => EventType::Undefined,
        }
    }
}

pub async fn chain_listen(
    db: &sqlx::PgPool,
    rpc_uri: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let ws = alloy::transports::ws::WsConnect::new(rpc_uri);
    let provider = ProviderBuilder::new().connect_ws(ws).await?;

    let filter = Filter::new()
        .event("GlobalOrderEvent(bytes16,bytes16,bytes16,uint8,address)")
        .from_block(BlockNumberOrTag::Earliest);

    let mut sub = provider.subscribe_logs(&filter).await?;
    println!("✅ Listening for blockchain events...");

    while let Ok(log) = sub.recv().await {
        let primitive_log: Log = log.into();

        match GlobalOrderEvent::decode_log(&primitive_log) {
            Ok(event) => {
                // let vendor_uuid = bytes16_to_uuid(*event.vendorId)?;
                let order_uuid = bytes16_to_uuid(*event.orderId)?;
                // let customer_uuid = bytes16_to_uuid(*event.customerId)?;

                let event_type = EventType::from(event.eventType);
                let order_contract_address = event.orderAddress;

                match event_type {
                    EventType::Created => {
                        info!("got CREATED event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            Some(&order_contract_address.to_string()),
                            None,
                            Some(OrderStatus::Created),
                        )
                        .await?;
                    },
                    EventType::Approved => {
                        info!("got APPROVED event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            None,
                            None,
                            Some(OrderStatus::Approved),
                        )
                        .await?;
                    },
                    EventType::Paid => {
                        info!("got PAID event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            None,
                            None,
                            Some(OrderStatus::Paid),
                        )
                        .await?;
                    },
                    EventType::Sold => {
                        info!("got SOLD event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            None,
                            None,
                            Some(OrderStatus::Sold),
                        )
                        .await?;
                    },
                    EventType::Delivered => {
                        info!("got DELIVERED event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            None,
                            None,
                            Some(OrderStatus::Delivered),
                        )
                        .await?;
                    },
                    EventType::Cancelled => {
                        info!("got CANCELLED event");
                        sqlx_utils::update_order(
                            db,
                            order_uuid,
                            None,
                            None,
                            Some(OrderStatus::Cancelled),
                        )
                        .await?;
                    },
                    EventType::Undefined => {
                        eprintln!("⚠️ Unknown event type: {}", event.eventType);
                    },
                }
            },
            Err(e) => eprintln!("⚠️ Failed to decode event: {:?}", e),
        }
    }

    Ok(())
}
