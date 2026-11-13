use crate::{config::AppState, handlers, kafka};
use axum::{Router, http::method::Method, routing::patch};
use axum_extra::routing::{RouterExt, TypedPath};
use init_utils::init_cors;
use middleware::validate_auth_cookie;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/customers/profile/{user_id}")]
pub struct UserIdParam {
    pub user_id: String,
}

pub async fn create_app(app_state: Arc<AppState>) -> std::io::Result<()> {
    //  Run kafka consumer
    tokio::spawn(kafka::listen(
        app_state.consumer.clone(),
        app_state.db_connection.clone(),
    ));

    let public_routes = Router::new().typed_get(handlers::fetch_customer_profile);

    let protected_routes = Router::new()
        .route(
            "/api/customers/profile",
            patch(handlers::update_customer_profile),
        )
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let cors_urls = vec![
        &app_state.config.frontend_domain,
        &app_state.config.auth_api_domain,
    ];

    let cors_layer = init_cors(cors_urls, vec![Method::GET, Method::PATCH]);

    //  Configure App
    let app = protected_routes
        .merge(public_routes)
        .layer(cors_layer)
        .with_state(app_state.clone());

    let server_url = format!("{}:{}", app_state.config.host, app_state.config.port);

    tracing::info!("Customer service on {}", &server_url);

    let listener = tokio::net::TcpListener::bind(server_url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
