use serde::Deserialize;
use std::str::FromStr;

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

pub trait JwksTrait {
    fn jwks(&self) -> std::sync::Arc<Jwks>;
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum UserType {
    Admin,
    Customer,
    Vendor,
    Unknown,
}

impl FromStr for UserType {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "admin" => Ok(UserType::Admin),
            "customer" => Ok(UserType::Customer),
            "vendor" => Ok(UserType::Vendor),
            _ => Err(()),
        }
    }
}
