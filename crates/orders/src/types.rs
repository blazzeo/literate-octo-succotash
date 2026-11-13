use crate::sqlx_utils::types::{Order, OrderGood, OrderStatus};
use bigdecimal::ToPrimitive;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug, Clone)]
pub struct OrderRequest {
    pub vendor_id: String,
    pub billing_address: String,
    pub shipping_address: String,
    pub goods: Vec<OrderGoodRequest>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateOrderRequest {
    pub billing_address: Option<String>,
    pub shipping_address: Option<String>,
    pub state: Option<OrderStatus>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrderGoodRequest {
    pub good_id: String,
    pub amount: i32,
    pub price_per_unit: f64,
}

#[derive(Debug, Deserialize)]
pub struct UserIdQuery {
    pub user_id: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct OrderResponse {
    pub id: String,
    pub customer_id: String,
    pub vendor_id: String,
    pub billing_address: String,
    pub shipping_address: String,
    pub status: OrderStatus,
    pub goods: Vec<OrderGoodRequest>,
}

impl From<OrderGood> for OrderGoodRequest {
    fn from(value: OrderGood) -> Self {
        Self {
            good_id: value.good_id,
            amount: value.amount,
            price_per_unit: value.price_per_unit.to_f64().unwrap_or_default(),
        }
    }
}

impl OrderResponse {
    pub fn build(
        order: Order,
        goods: Vec<OrderGood>,
    ) -> Self {
        Self {
            id: order.id.to_string(),
            customer_id: order.customer_id,
            vendor_id: order.vendor_id,
            billing_address: order.billing_address,
            shipping_address: order.shipping_address,
            status: order.status,
            goods: goods.into_iter().map(Into::into).collect(),
        }
    }
}
