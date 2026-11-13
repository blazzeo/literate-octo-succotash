use goods::{
    handlers::services::goods_with_filters,
    types::{Filters, Good},
};
use mongodb;

const MONGO_URI: &str = "mongodb://root:root@localhost:27017";

#[tokio::test]
async fn test_connection() {
    let client = mongodb::Client::with_uri_str(MONGO_URI).await;

    assert!(client.is_ok())
}

#[tokio::test]
async fn test_init_db() {
    let client = mongodb::Client::with_uri_str(MONGO_URI)
        .await
        .expect("Can't connect to db");

    let db = client.database("goods");

    let _collection = db.collection::<Good>("goods");

    assert!(true)
}

#[tokio::test]
async fn test_goods_with_filter() {
    let client = mongodb::Client::with_uri_str(MONGO_URI)
        .await
        .expect("Can't connect to db");

    let db = client.database("emarket");

    let filters = Filters {
        name: None,
        min_price: None,
        max_price: None,
        category_ids: None,
        vendor_id: Some("b9585b77-ec01-4923-a420-6b30a826a257".into()),
    };

    let result = goods_with_filters(&db, 0, 30, &filters)
        .await
        .expect("Can't get goods");

    dbg!(result);

    assert!(true);
}
