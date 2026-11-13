use axum_extra::routing::TypedPath;
use serde::Deserialize;

use crate::sqlx_utils::types::OrderStatus;

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/orders/{id}")]
pub struct OrderIdParam {
    pub id: String,
}

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/orders/{id}/approve")]
pub struct OrderIdApproveParam {
    pub id: String,
}

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/orders/{id}/deny")]
pub struct OrderIdDenyParam {
    pub id: String,
}

#[derive(Deserialize)]
pub struct OrdersFilter {
    pub user_id: String,
    pub stage: Option<OrderStatus>,
}
