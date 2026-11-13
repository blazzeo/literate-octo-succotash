use clap::Parser;
use dotenv;
use middleware::types::Jwks;
use tokio;
use vendors::config;

#[tokio::test]
async fn test_keycloak_jwks() {
    dotenv::dotenv().ok();

    let config = config::KeycloakConfig::parse();

    let url = format!(
        "{}/realms/{}/protocol/openid-connect/certs",
        config.keycloak_url, config.keycloak_realm
    );

    let res = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .expect("Can't get JWKS from keycloak");

    let jwks = res.json::<Jwks>().await.expect("Can't parse JWKS");

    assert!(!jwks.keys.is_empty());
}
