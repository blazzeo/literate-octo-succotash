use crate::{
    sqlx_utils::{self, types::OrderStatus},
    types::{OrderGoodRequest, OrderRequest, OrderResponse},
};
use service_error::ServiceError;
use std::{str::FromStr, vec};
use uuid::Uuid;

pub async fn get_order(
    db: &sqlx::PgPool,
    order_id: &str,
) -> Result<OrderResponse, ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    let order = sqlx_utils::get_order(db, order_id).await?;
    let goods = sqlx_utils::get_order_goods(db, order_id).await?;

    Ok(OrderResponse::build(order, goods))
}

pub async fn get_order_goods(
    db: &sqlx::PgPool,
    order_id: &str,
) -> Result<Vec<OrderGoodRequest>, ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    let goods = sqlx_utils::get_order_goods(db, order_id).await?;
    let goods_response = goods.into_iter().map(Into::into).collect();

    Ok(goods_response)
}

pub async fn get_customer_orders(
    db: &sqlx::PgPool,
    customer_id: &str,
    order_stage: &Option<OrderStatus>,
) -> Result<Vec<OrderResponse>, ServiceError> {
    let orders = sqlx_utils::get_customer_orders(db, customer_id, order_stage).await?;

    let mut result: Vec<OrderResponse> = vec![];

    for order in orders.into_iter() {
        let order_goods = sqlx_utils::get_order_goods(db, order.id).await?;

        result.push(OrderResponse::build(order, order_goods));
    }

    Ok(result)
}

pub async fn get_vendor_orders(
    db: &sqlx::PgPool,
    vendor_id: &str,
    order_stage: &Option<OrderStatus>,
) -> Result<Vec<OrderResponse>, ServiceError> {
    let orders = sqlx_utils::get_vendor_orders(db, vendor_id, order_stage).await?;

    let mut result: Vec<OrderResponse> = vec![];

    for order in orders.into_iter() {
        let order_goods = sqlx_utils::get_order_goods(db, order.id).await?;

        result.push(OrderResponse::build(order, order_goods));
    }

    Ok(result)
}

pub async fn add_order(
    db: &sqlx::PgPool,
    customer_id: &str,
    order: OrderRequest,
) -> Result<Uuid, ServiceError> {
    let res = sqlx_utils::add_order(
        db,
        customer_id,
        &order.vendor_id,
        &order.shipping_address,
        &order.billing_address,
    )
    .await?;

    Ok(res)
}

pub async fn add_order_good(
    db: &sqlx::PgPool,
    order_id: &str,
    good: OrderGoodRequest,
) -> Result<(), ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::add_order_good(db, order_id, good).await?;

    Ok(())
}

pub async fn add_order_goods(
    db: &sqlx::PgPool,
    order_id: &str,
    goods: Vec<OrderGoodRequest>,
) -> Result<(), ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::add_order_goods(db, order_id, goods).await?;

    Ok(())
}

pub async fn update_order(
    db: &sqlx::PgPool,
    order_id: &str,
    billing_adress: Option<&str>,
    shipping_address: Option<&str>,
    stage: Option<OrderStatus>,
) -> Result<(), ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::update_order(db, order_id, billing_adress, shipping_address, stage).await?;

    Ok(())
}

pub async fn update_order_good(
    db: &sqlx::PgPool,
    order_id: &str,
    good_id: &str,
    amount: i32,
) -> Result<(), ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::update_order_good(db, order_id, good_id, amount).await?;

    Ok(())
}

pub async fn delete_order(
    db: &sqlx::PgPool,
    order_id: &str,
) -> Result<(), ServiceError> {
    let id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::delete_order(db, id).await?;

    Ok(())
}

pub async fn delete_order_good(
    db: &sqlx::PgPool,
    order_id: &str,
    good_id: &str,
) -> Result<(), ServiceError> {
    let order_id = Uuid::from_str(order_id).map_err(|_| ServiceError::Conflict)?;

    sqlx_utils::delete_order_good(db, order_id, good_id).await?;

    Ok(())
}
