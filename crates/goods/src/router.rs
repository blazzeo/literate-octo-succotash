use crate::{config::AppState, handlers};
use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use axum_extra::routing::RouterExt;
use init_utils::init_cors;
use middleware::validate_auth_cookie;
use std::sync::Arc;

pub async fn create_app(app_state: Arc<AppState>) -> std::io::Result<()> {
    let server_url = format!("{}:{}", app_state.config.host, app_state.config.port);

    let cors_layer = init_cors(
        vec![
            &app_state.config.customer_frontend_domain,
            &app_state.config.vendor_frontend_domain,
        ],
        vec![
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ],
    );

    //  Configure Routes
    let public_routes = Router::new()
        .typed_get(handlers::get_good)
        .typed_get(handlers::goods_with_filters)
        .route("/api/categories/", get(handlers::get_categories))
        .route("/api/goods/amount", get(handlers::get_goods_amount));

    let protected_routes = Router::new()
        .typed_put(handlers::update_good)
        .typed_get(handlers::get_basket)
        .typed_post(handlers::add_basket)
        .typed_delete(handlers::delete_good)
        .typed_delete(handlers::delete_basket)
        .route("/api/goods/", post(handlers::add_good))
        .route("/api/basket/info", get(handlers::info_basket))
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let app = protected_routes
        .merge(public_routes)
        .layer(cors_layer)
        .with_state(app_state);

    tracing::info!("Goods service on {}", &server_url);

    let listener = tokio::net::TcpListener::bind(server_url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
