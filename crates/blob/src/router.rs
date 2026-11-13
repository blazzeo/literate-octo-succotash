use crate::{
    config::AppState,
    handlers,
    init::{self},
    kafka,
};
use axum::{
    Router,
    http::Method,
    routing::{delete, get, post, put},
};
use init_utils::init_cors;
use middleware::validate_auth_cookie;
use std::sync::Arc;

pub async fn create_app(app_state: Arc<AppState>) -> std::io::Result<()> {
    let server_url = format!("{}:{}", app_state.config.host, app_state.config.port);

    init::create_static_dir(&app_state.config.static_dir);

    //  Run kafka consumer
    tokio::spawn(kafka::listen(
        app_state.consumer.clone(),
        app_state.config.static_dir.clone(),
    ));

    let public_routes = Router::new()
        .route("/api/file/{*file_path}", get(handlers::read_file))
        .route(
            "/api/info/goods/{user_id}/{good_id}",
            get(handlers::get_info),
        );

    let protected_routes = Router::new()
        .route("/api/file/{*file_path}", post(handlers::upload_file))
        .route("/api/file/{*file_path}", put(handlers::update_files))
        .route("/api/file/{*file_path}", delete(handlers::delete_file))
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let cors_layer = init_cors(
        vec![
            &app_state.config.auth_frontend_domain,
            &app_state.config.vendor_frontend_domain,
            &app_state.config.customer_frontend_domain,
        ],
        vec![
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ],
    );

    //  Configure App
    let app = protected_routes
        .merge(public_routes)
        .layer(cors_layer)
        .with_state(app_state);

    tracing::info!("Blob service on {}", &server_url);

    let listener = tokio::net::TcpListener::bind(server_url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
