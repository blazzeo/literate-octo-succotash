use crate::{auth::handlers::*, config::AppState, registration::handlers::*};
use axum::{
    http::Method,
    routing::{delete, get, post},
};
use axum_extra::routing::RouterExt;
use middleware::validate_auth_cookie;

pub async fn create_app(app_state: std::sync::Arc<AppState>) -> std::io::Result<()> {
    let origins = vec![
        &app_state.config.frontend_domains.admin,
        &app_state.config.frontend_domains.auth,
        &app_state.config.frontend_domains.customer,
        &app_state.config.frontend_domains.vendor,
    ];

    let cors_layer = init_utils::init_cors(
        origins,
        vec![Method::GET, Method::POST, Method::OPTIONS, Method::DELETE],
    );

    let public_routes = axum::Router::new()
        .typed_delete(delete_user)
        .typed_post(forgot_password)
        .typed_get(check_login)
        .typed_get(check_email)
        .route("/api/users/me", get(verify_access))
        .route("/api/users/login", post(login))
        .route("/api/users/logout", post(logout))
        .route("/api/users/refresh", post(refresh))
        .route("/api/users/customers/register", post(register_customer))
        .route("/api/users/vendors/register", post(register_vendor))
        .route("/api/users/verify_email", post(verify_email))
        .route("/api/users/reset_pass", post(reset_password));

    //  Configure Routes
    let protected_routes = axum::Router::new()
        .route("/api/users", delete(deactivate_user))
        .route_layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            validate_auth_cookie,
        ));

    let app = public_routes
        .merge(protected_routes)
        .layer(cors_layer)
        .with_state(app_state.clone());

    let url = format!("{}:{}", &app_state.config.host, &app_state.config.port);
    tracing::info!("Auth service on {}", &url);

    //  Start app
    let listener = tokio::net::TcpListener::bind(url).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
