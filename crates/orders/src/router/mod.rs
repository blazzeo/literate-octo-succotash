use crate::{chain_listener::chain_listen, config::AppState, handlers, init::init_db_tables};
use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use init_utils::init_cors;
use middleware::validate_auth_cookie;
use std::sync::Arc;
pub mod router_types;

pub async fn create_app(app_state: Arc<AppState>) -> std::io::Result<()> {
    tokio::spawn({
        let app_state = Arc::clone(&app_state);
        async move {
            let _ = chain_listen(&app_state.db_connection, &app_state.config.blockchain_rpc).await;
        }
    });

    init_db_tables(&app_state.db_connection)
        .await
        .expect("Can't init db tables");

    let vendor_routes = Router::new()
        .route("/api/orders", get(handlers::get_orders))
        .route("/api/orders", post(handlers::create_order))
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let cors_urls = vec![
        &app_state.config.customer_frontend_domain,
        &app_state.config.vendor_frontend_domain,
        &app_state.config.admin_frontend_domain,
    ];

    let cors_layer = init_cors(cors_urls, vec![Method::GET, Method::POST, Method::OPTIONS]);

    //  Configure App
    let app = vendor_routes
        .layer(cors_layer)
        .with_state(app_state.clone());

    let server_url = format!("{}:{}", app_state.config.host, app_state.config.port);

    tracing::info!("Orders service on {}", &server_url);

    let listener = tokio::net::TcpListener::bind(server_url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
