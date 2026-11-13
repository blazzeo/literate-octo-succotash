use bigdecimal::FromPrimitive;
use service_error::ServiceError;
use sqlx::{PgPool, Row};
use types::OrderStatus;
use uuid::Uuid;

use crate::{
    sqlx_utils::types::{Order, OrderGood},
    types::OrderGoodRequest,
};

pub mod types;

/// # Get Order
pub async fn get_order(
    db: &PgPool,
    order_id: Uuid,
) -> Result<Order, ServiceError> {
    let order = sqlx::query_as::<_, Order>(
        "SELECT * FROM Orders
        WHERE id = $1",
    )
    .bind(order_id)
    .fetch_one(db)
    .await?;

    Ok(order)
}

/// # Get Goods of Order
/// ## Returns Vector of Goods
pub async fn get_order_goods(
    db: &PgPool,
    order_id: Uuid,
) -> Result<Vec<OrderGood>, ServiceError> {
    let goods = sqlx::query_as::<_, OrderGood>("SELECT * FROM OrderGoods WHERE order_id = $1")
        .bind(order_id)
        .fetch_all(db)
        .await?;

    Ok(goods)
}

/// # Get Customer's Order by his Id
/// ## Returns Vector of Orders
pub async fn get_customer_orders(
    db: &PgPool,
    customer_id: &str,
    stage: &Option<OrderStatus>,
) -> Result<Vec<Order>, ServiceError> {
    let mut query =
        String::from("SELECT * FROM Orders WHERE customer_id = $1 AND status <> 'pending'");
    if stage.is_some() {
        query.push_str(" AND status = $2");
    }

    let mut q = sqlx::query_as::<_, Order>(&query).bind(customer_id);
    if let Some(order_stage) = stage {
        q = q.bind(order_stage);
    }

    let orders = q.fetch_all(db).await?;

    Ok(orders)
}

/// # Get Customer's Order by his Id
/// ## Returns Vector of Orders
pub async fn get_vendor_orders(
    db: &PgPool,
    vendor_id: &str,
    stage: &Option<OrderStatus>,
) -> Result<Vec<Order>, ServiceError> {
    let mut query =
        String::from("SELECT * FROM Orders WHERE vendor_id = $1 AND status <> 'pending'");
    if stage.is_some() {
        query.push_str(" AND status = $2");
    }

    let mut q = sqlx::query_as::<_, Order>(&query).bind(vendor_id);
    if let Some(order_stage) = stage {
        q = q.bind(order_stage);
    }

    let orders = q.fetch_all(db).await?;

    Ok(orders)
}

/// # Creates on order
/// ## Returns Order's Id
pub async fn add_order(
    db: &PgPool,
    customer_id: &str,
    vendor_id: &str,
    shipping_address: &str,
    billing_adress: &str,
) -> Result<Uuid, ServiceError> {
    let row = sqlx::query(
        "INSERT INTO Orders (
            customer_id, 
            vendor_id, 
            shipping_address, 
            billing_address, 
            status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id",
    )
    .bind(customer_id)
    .bind(vendor_id)
    .bind(shipping_address)
    .bind(billing_adress)
    .bind(OrderStatus::Pending)
    .fetch_one(db)
    .await?;

    let order_id: Uuid = row.try_get(0)?;

    Ok(order_id)
}

/// # Adds Good to OrderGoods
pub async fn add_order_good(
    db: &PgPool,
    order_id: Uuid,
    good: OrderGoodRequest,
) -> Result<(), ServiceError> {
    sqlx::query(
        "INSERT INTO OrderGoods (order_id, good_id, amount, price_per_unit)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(order_id)
    .bind(good.good_id.clone())
    .bind(good.amount)
    .bind(bigdecimal::BigDecimal::from_f64(good.price_per_unit))
    .execute(db)
    .await?;

    Ok(())
}

/// # Adds Goods to OrderGoods table
/// ## Returns number of affected rows
pub async fn add_order_goods(
    db: &PgPool,
    order_id: Uuid,
    goods: Vec<OrderGoodRequest>,
) -> Result<i64, ServiceError> {
    let rows_before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM OrderGoods WHERE order_id = $1")
            .bind(order_id)
            .fetch_one(db)
            .await?;

    for good in goods {
        add_order_good(db, order_id, good).await?;
    }

    let rows_after: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM OrderGoods WHERE order_id = $1")
        .bind(order_id)
        .fetch_one(db)
        .await?;

    Ok(rows_after - rows_before)
}

/// # Updates Order Info
pub async fn update_order(
    db: &PgPool,
    order_id: Uuid,
    billing_address: Option<&str>,
    shipping_address: Option<&str>,
    stage: Option<OrderStatus>,
) -> Result<(), ServiceError> {
    if let Some(billing) = billing_address {
        sqlx::query("UPDATE Orders SET billing_address = $1 WHERE id = $2")
            .bind(billing)
            .bind(order_id)
            .execute(db)
            .await?;
    }

    if let Some(shipping) = shipping_address {
        sqlx::query("UPDATE Orders SET shipping_address = $1 WHERE id = $2")
            .bind(shipping)
            .bind(order_id)
            .execute(db)
            .await?;
    }

    if let Some(status) = stage {
        sqlx::query("UPDATE Orders SET status = $1 WHERE id = $2")
            .bind(status)
            .bind(order_id)
            .execute(db)
            .await?;
    }

    Ok(())
}

/// # Updates Order's Good
pub async fn update_order_good(
    db: &PgPool,
    order_id: Uuid,
    good_id: &str,
    amount: i32,
) -> Result<(), ServiceError> {
    sqlx::query("UPDATE OrderGoods SET amount = $1 WHERE order_id = $2 AND good_id = $3")
        .bind(amount)
        .bind(order_id)
        .bind(good_id)
        .execute(db)
        .await?;

    Ok(())
}

/// # Deletes Order
pub async fn delete_order(
    db: &PgPool,
    order_id: Uuid,
) -> Result<(), ServiceError> {
    sqlx::query("DELETE FROM Orders WHERE id = $1")
        .bind(order_id)
        .execute(db)
        .await?;

    Ok(())
}

/// # Deletes Order's Good
pub async fn delete_order_good(
    db: &PgPool,
    order_id: Uuid,
    good_id: &str,
) -> Result<(), ServiceError> {
    sqlx::query("DELETE FROM OrderGoods WHERE order_id = $1 AND good_id = $2")
        .bind(order_id)
        .bind(good_id)
        .execute(db)
        .await?;

    Ok(())
}
