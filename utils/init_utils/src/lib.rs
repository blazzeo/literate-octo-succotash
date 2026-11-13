use axum::http::{HeaderValue, Method};
use middleware::types::Jwks;
use tower_http::cors::CorsLayer;

pub fn init_cors(
    urls: Vec<&String>,
    methods: Vec<Method>,
) -> CorsLayer {
    let origins: Vec<HeaderValue> = urls
        .iter()
        .filter_map(|url| url.parse::<HeaderValue>().ok())
        .collect();

    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods(methods)
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
            axum::http::header::COOKIE,
        ])
        .expose_headers([axum::http::header::SET_COOKIE])
        .allow_credentials(true)
}

pub async fn fetch_jwks(
    url: &str,
    realm: &str,
    client: &reqwest::Client,
) -> Jwks {
    let url = format!("{}/realms/{}/protocol/openid-connect/certs", url, realm);
    let res = match client.get(&url).send().await {
        Ok(json) => json,
        Err(e) => {
            tracing::error!("Can't fetch JWKS: {}", e);
            std::process::exit(1);
        },
    };
    match res.json::<Jwks>().await {
        Ok(jwks) => jwks,
        Err(e) => {
            tracing::error!("Can't parse JWKS: {}", e);
            std::process::exit(1);
        },
    }
}

#[cfg(feature = "kafka")]
pub fn init_kafka_consumer(
    url: &str,
    group: &str,
) -> rdkafka::consumer::StreamConsumer {
    match rdkafka::ClientConfig::new()
        .set("bootstrap.servers", url)
        .set("group.id", group)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()
    {
        Ok(client) => client,
        Err(e) => {
            tracing::error!("Failed to create kafka consumer: {}", e);
            std::process::exit(1);
        },
    }
}
