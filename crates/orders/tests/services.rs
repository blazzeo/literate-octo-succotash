use orders::{
    handlers::services,
    init::init_db_tables,
    sqlx_utils::types::OrderStatus,
    types::{OrderGoodRequest, OrderRequest},
};
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio;

#[tokio::test]
async fn test_crud() {
    dotenv::dotenv().ok();

    let conn_str = std::env::var("DATABASE_URL").expect("Can't get connection string");

    let db = PgPoolOptions::new()
        .max_connections(2)
        .connect(&conn_str)
        .await
        .expect("Can't create db connection");

    init_db_tables(&db).await.expect("Can't init tables");

    let order = OrderRequest {
        vendor_id: "test".into(),
        shipping_address: "test".into(),
        billing_address: "test".into(),
    };

    let order_good = OrderGoodRequest {
        good_id: "test".into(),
        amount: 3,
        price_per_unit: 250.0,
    };

    let order_goods = vec![
        OrderGoodRequest {
            good_id: "test_1".into(),
            amount: 1,
            price_per_unit: 10.0,
        },
        OrderGoodRequest {
            good_id: "test_2".into(),
            amount: 2,
            price_per_unit: 15.0,
        },
    ];

    //  GET
    test_get_orders_without_stage(&db).await;
    test_get_orders_with_stage(&db, OrderStatus::Planned).await;

    //  POST
    let uuid = test_add_order(&db, "test", order).await;
    test_add_order_good(&db, &uuid.to_string(), order_good).await;
    test_add_order_goods(&db, &uuid.to_string(), order_goods).await;

    //  GET
    test_get_orders_without_stage(&db).await;
    test_get_orders_with_stage(&db, OrderStatus::Planned).await;

    //  PUT
    test_update_order(
        &db,
        &uuid.to_string(),
        Some("TEST UPDATE".into()),
        Some("TEST UPDATE".into()),
        Some(OrderStatus::Paid),
    )
    .await;
    test_update_order_good(&db, &uuid.to_string(), "test", 25).await;

    //  GET
    test_get_orders_without_stage(&db).await;
    test_get_orders_with_stage(&db, OrderStatus::Planned).await;

    //  DELETE Good + check if deleted
    test_delete_order_good(&db, &uuid.to_string(), "test").await;
    test_get_orders_without_stage(&db).await;

    //  DELETE Order + check
    test_delete_order(&db, &uuid.to_string()).await;
    test_get_orders_without_stage(&db).await;
}

//  GET
async fn test_get_orders_without_stage(db_connection: &PgPool) {
    let res = services::get_customer_orders(&db_connection, "test", &None)
        .await
        .unwrap();
    dbg!(res);
}

async fn test_get_orders_with_stage(
    db_connection: &PgPool,
    stage: OrderStatus,
) {
    let res = services::get_customer_orders(&db_connection, "test", &Some(stage))
        .await
        .unwrap();
    dbg!(res);
}

//  POST
async fn test_add_order(
    db_connection: &PgPool,
    customer_id: &str,
    order: OrderRequest,
) -> uuid::Uuid {
    let uuid = services::add_order(db_connection, customer_id, order)
        .await
        .expect("POST Error");
    dbg!(uuid);
    uuid
}

async fn test_add_order_good(
    db_connection: &PgPool,
    order_id: &str,
    good: OrderGoodRequest,
) {
    services::add_order_good(&db_connection, order_id, good)
        .await
        .expect("POST Good Error");
}

async fn test_add_order_goods(
    db_connection: &PgPool,
    order_id: &str,
    goods: Vec<OrderGoodRequest>,
) {
    services::add_order_goods(&db_connection, order_id, goods)
        .await
        .expect("POST Goods Error");
}

//  PUT
async fn test_update_order(
    db_connection: &PgPool,
    order_id: &str,
    billing_adress: Option<String>,
    shipping_address: Option<String>,
    stage: Option<OrderStatus>,
) {
    services::update_order(
        &db_connection,
        order_id,
        billing_adress.as_deref(),
        shipping_address.as_deref(),
        stage,
    )
    .await
    .expect("PUT Order Error");
}

async fn test_update_order_good(
    db_connection: &PgPool,
    order_id: &str,
    good_id: &str,
    amount: i32,
) {
    services::update_order_good(&db_connection, order_id, good_id, amount)
        .await
        .expect("PUT Order Good error");
}

//  DELETE
async fn test_delete_order(
    db_connection: &PgPool,
    order_id: &str,
) {
    services::delete_order(db_connection, order_id)
        .await
        .expect("DELETE Order error");
}

async fn test_delete_order_good(
    db_connection: &PgPool,
    order_id: &str,
    good_id: &str,
) {
    services::delete_order_good(&db_connection, order_id, good_id)
        .await
        .expect("DELETE Order Good error");
}
