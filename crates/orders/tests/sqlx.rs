use dotenv::dotenv;
use orders::{
    init::init_db_tables,
    sqlx_utils::{add_order, add_order_goods, delete_order, types::OrderStatus, update_order},
    types::OrderGoodRequest,
};
use sqlx::{Connection, PgConnection, PgPool, postgres::PgPoolOptions};
use uuid::Uuid;

#[tokio::test]
async fn test_connection() {
    dotenv().ok();

    let conn_str = std::env::var("DATABASE_URL").expect("Can't get connection string");

    let mut db = PgConnection::connect(&conn_str)
        .await
        .expect("Can't create connection with Database");

    let val: i32 = sqlx::query_scalar("SELECT 10")
        .fetch_one(&mut db)
        .await
        .ok()
        .expect("Can't execute query");

    assert_eq!(val, 10)
}

#[tokio::test]
async fn test_init_tables() {
    dotenv().ok();

    let conn_str = std::env::var("DATABASE_URL").expect("Can't get connection string");

    let db = PgPoolOptions::new()
        .max_connections(2)
        .connect(&conn_str)
        .await
        .expect("Can't create connection with Database");

    init_db_tables(&db).await.expect("Can't init tables");

    assert!(true)
}

#[tokio::test]
// #[ignore = "Test"]
async fn test_order() {
    dotenv().ok();

    let conn_str = std::env::var("DATABASE_URL").expect("Can't get connection string");

    let mut db = PgPoolOptions::new()
        .max_connections(2)
        .connect(&conn_str)
        .await
        .expect("Can't create connection with Database");

    let order_id = test_add_order(&db, "test", "test", "test", "test").await;
    let goods: Vec<OrderGoodRequest> = vec![
        OrderGoodRequest {
            good_id: "0".into(),
            amount: 0,
            price_per_unit: 0.0,
        },
        OrderGoodRequest {
            good_id: "1".into(),
            amount: 0,
            price_per_unit: 0.0,
        },
        OrderGoodRequest {
            good_id: "2".into(),
            amount: 0,
            price_per_unit: 0.0,
        },
    ];
    let rows_affected = test_add_order_goods(&db, &order_id, goods).await;

    assert_eq!(rows_affected, 3);

    test_update_order(
        &mut db,
        &order_id,
        "new_billing_address",
        "new_shipping_address",
        OrderStatus::Cancelled,
    )
    .await;
    test_delete_order(&mut db, &order_id).await;
}

async fn test_add_order(
    db: &PgPool,
    customer_id: &str,
    vendor_id: &str,
    shipping_address: &str,
    billing_adress: &str,
) -> uuid::Uuid {
    let order_id = add_order(
        &db,
        customer_id,
        vendor_id,
        shipping_address,
        billing_adress,
    )
    .await
    .expect("Can't add order");

    order_id
}

async fn test_add_order_goods(
    db: &PgPool,
    order_id: &Uuid,
    goods: Vec<OrderGoodRequest>,
) -> i64 {
    let rows_added = add_order_goods(&db, *order_id, goods)
        .await
        .expect("Can't add goods");

    rows_added
}

async fn test_update_order(
    db: &PgPool,
    order_id: &Uuid,
    billing_adress: &str,
    shipping_address: &str,
    stage: OrderStatus,
) {
    update_order(
        &db,
        *order_id,
        Some(billing_adress),
        Some(shipping_address),
        Some(stage),
    )
    .await
    .expect("Can't update order");
}

async fn test_delete_order(
    db: &PgPool,
    order_id: &Uuid,
) {
    delete_order(&db, *order_id)
        .await
        .expect("Can't delete order");
}
