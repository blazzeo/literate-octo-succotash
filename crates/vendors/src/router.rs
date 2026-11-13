use crate::{config::AppState, handlers, kafka};
use axum::{Router, http::Method, routing::patch};
use axum_extra::routing::{RouterExt, TypedPath};
use init_utils::init_cors;
use middleware::validate_auth_cookie;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/vendor/profile/{user_id}")]
pub struct UserIdParam {
    pub user_id: String,
}

pub async fn create_app(app_state: Arc<AppState>) -> std::io::Result<()> {
    let server_url = format!("{}:{}", app_state.config.host, app_state.config.port);

    //  Run kafka consumer
    tokio::spawn(kafka::listen(
        app_state.consumer.clone(),
        app_state.db_connection.clone(),
    ));

    let public_routes = Router::new().typed_get(handlers::fetch_vendor_profile);

    let protected_routes = Router::new()
        .route(
            "/api/vendor/profile",
            patch(handlers::update_vendor_profile),
        )
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let cors_urls = vec![
        &app_state.config.frontend_domain,
        &app_state.config.auth_api_domain,
        &app_state.config.customer_client_domain,
    ];

    let cors_layer = init_cors(cors_urls, vec![Method::GET, Method::PATCH, Method::OPTIONS]);

    //  Configure App
    let app = protected_routes
        .merge(public_routes)
        .layer(cors_layer)
        .with_state(app_state);

    tracing::info!("Vendors service on {}", &server_url);

    let listener = tokio::net::TcpListener::bind(server_url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
