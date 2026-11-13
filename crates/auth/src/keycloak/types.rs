use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[derive(Debug)]
pub struct KeycloakAdminClientConfig {
    pub client_id: String,
    pub realm: String,
    pub username: String,
    pub password: String,
    pub client_secret: String,
}

#[derive(Debug)]
pub struct CustomKeycloakAdminToken {
    pub config: KeycloakAdminClientConfig,
    pub client: reqwest::Client,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Jwk {
    pub kid: String,
    pub kty: String,
    pub alg: String,
    #[serde(rename = "use")]
    pub use_: String,
    pub n: String,
    pub e: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Jwks {
    pub keys: Vec<Jwk>,
}

#[derive(Debug, Deserialize)]
pub struct RealmAccess {
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ResourceRoles {
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub sub: Option<String>,
    pub exp: Option<u64>,
    pub iat: Option<u64>,
    pub iss: Option<String>,
    pub aud: Option<String>,
    pub typ: Option<String>,
    pub azp: Option<String>,
    pub name: Option<String>,
    pub preferred_username: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub email: Option<String>,
    pub email_verified: Option<bool>,
    pub realm_access: Option<RealmAccess>,
    pub resource_access: Option<HashMap<String, ResourceRoles>>,
}
