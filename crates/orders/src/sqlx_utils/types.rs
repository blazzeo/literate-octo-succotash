use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Deserialize, Debug, sqlx::FromRow)]
pub struct Order {
    pub id: Uuid,
    pub customer_id: String,
    pub vendor_id: String,
    pub billing_address: String,
    pub shipping_address: String,
    pub status: OrderStatus,
}

#[derive(sqlx::FromRow)]
pub struct OrderGood {
    pub order_id: Uuid,
    pub good_id: String,
    pub amount: i32,
    pub price_per_unit: BigDecimal,
}

#[derive(Deserialize, Serialize, Debug, sqlx::Type)]
#[sqlx(type_name = "order_status", rename_all = "lowercase")]
pub enum OrderStatus {
    Created,
    Approved,
    Paid,
    Sold,
    Cancelled,
    Pending,
    Delivered,
}

impl FromStr for OrderStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "created" => Ok(Self::Created),
            "approved" => Ok(Self::Approved),
            "paid" => Ok(Self::Paid),
            "sold" => Ok(Self::Sold),
            "cancelled" => Ok(Self::Cancelled),
            "pending" => Ok(Self::Pending),
            "delivered" => Ok(Self::Delivered),
            _ => Err(()),
        }
    }
}
