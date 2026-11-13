use dotenv::dotenv;
use sea_orm::{Database, DbErr};

#[tokio::test]
async fn test_connection() {
    dotenv().ok();

    let url = std::env::var("DATABASE_URL").expect("No env connection string");

    let db = Database::connect(url).await.expect("Can't open connection");

    assert!(db.ping().await.is_ok());

    let _ = db.clone().close().await;

    assert!(matches!(db.ping().await, Err(DbErr::ConnectionAcquire(_))));
}
