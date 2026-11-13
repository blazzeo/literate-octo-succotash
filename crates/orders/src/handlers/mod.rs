pub mod services;
use crate::{
    config::AppState,
    router::router_types::*,
    types::{OrderRequest, OrderResponse},
};
use axum::{
    Json,
    extract::{Query, State},
};
use middleware::{ClaimsExtension, types::UserType};
use service_error::ServiceError;
use std::sync::Arc;

pub async fn get_orders(
    State(state): State<Arc<AppState>>,
    filters: Query<OrdersFilter>,
    ClaimsExtension(claims, user_type): ClaimsExtension,
) -> Result<Json<Vec<OrderResponse>>, ServiceError> {
    let user_id = claims.sub.ok_or(ServiceError::Unauthorized)?;

    if user_id != filters.user_id && user_type != UserType::Admin {
        return Err(ServiceError::Forbidden);
    }

    let orders = match user_type {
        UserType::Customer => {
            services::get_customer_orders(&state.db_connection, &filters.user_id, &filters.stage)
                .await?
        },
        UserType::Vendor => {
            services::get_vendor_orders(&state.db_connection, &filters.user_id, &filters.stage)
                .await?
        },
        _ => vec![],
    };

    Ok(Json(orders))
}

pub async fn create_order(
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
    Json(order): Json<OrderRequest>,
) -> Result<Json<String>, ServiceError> {
    let user_id = claims.sub.ok_or(ServiceError::Conflict)?;
    let order_id_uuid = services::add_order(&state.db_connection, &user_id, order.clone()).await?;
    let order_id_str: String = order_id_uuid.to_string();

    services::add_order_goods(&state.db_connection, &order_id_str, order.goods).await?;

    Ok(Json(order_id_str))
}
