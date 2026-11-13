pub mod types;

use axum::{
    body::Body,
    extract::{FromRequestParts, Request, State},
    http::{self, StatusCode},
    middleware::Next,
    response::Response,
};
use axum_extra::extract::CookieJar;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header};
use serde::Deserialize;
use service_error::ServiceError;
use std::str::FromStr;

use crate::types::{Jwks, JwksTrait, UserType};

#[derive(Debug, Deserialize, Clone)]
pub struct RealmAccess {
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ResourceRoles {
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
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
    pub resource_access: Option<std::collections::HashMap<String, ResourceRoles>>,
}

#[derive(Debug)]
pub struct ClaimsExtension(pub Claims, pub UserType);

impl<S> FromRequestParts<S> for ClaimsExtension
where
    S: Send + Sync,
{
    type Rejection = ServiceError;

    async fn from_request_parts(
        parts: &mut http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        // Access to headers from req
        let ext = &parts.extensions;

        let claims = ext.get::<Claims>();

        match claims {
            Some(claims) => {
                //  Get user's Role
                let user_roles = claims
                    .realm_access
                    .clone()
                    .ok_or(ServiceError::Unauthorized)?
                    .roles;
                let user_type = if user_roles.contains(&"admin".into()) {
                    UserType::Admin
                } else if user_roles.contains(&"customer".into()) {
                    UserType::Customer
                } else if user_roles.contains(&"vendor".into()) {
                    UserType::Vendor
                } else {
                    return Err(ServiceError::Unauthorized);
                };
                Ok(ClaimsExtension(claims.clone(), user_type))
            },
            None => Err(ServiceError::Internal(
                "Claims not found in request extensions".to_string(),
            )),
        }
    }
}

pub async fn validate_auth_cookie<T>(
    State(state): State<std::sync::Arc<T>>,
    cookies: CookieJar,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode>
where
    T: JwksTrait,
{
    let token = get_auth_token(&cookies)?;

    match validate_token(token, &state.jwks()) {
        Ok(claims) => {
            req.extensions_mut().insert(claims);
            Ok(next.run(req).await)
        },
        Err(_) => Err(StatusCode::UNAUTHORIZED),
    }
}

fn get_auth_token(cookies: &CookieJar) -> Result<&str, StatusCode> {
    match cookies.get("access_token") {
        Some(token) => Ok(token.value()),
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

fn validate_token(
    token: &str,
    jwks: &Jwks,
) -> Result<Claims, StatusCode> {
    let header = decode_header(token).map_err(|_| StatusCode::UNAUTHORIZED)?;
    let kid = header.kid.ok_or(StatusCode::UNAUTHORIZED)?;

    // Find matching key
    let jwk = jwks
        .keys
        .iter()
        .find(|k| k.kid == kid)
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let decoding_key =
        DecodingKey::from_rsa_components(&jwk.n, &jwk.e).map_err(|_| StatusCode::UNAUTHORIZED)?;

    let validation = Validation::new(Algorithm::RS256);

    let token_data = decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(token_data.claims)
}

pub async fn require_roles(
    State(required_roles): State<Vec<UserType>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let claims = req
        .extensions()
        .get::<Claims>()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    authorize_role(claims, required_roles)?;

    Ok(next.run(req).await)
}

fn authorize_role(
    claims: &Claims,
    allowed_roles: Vec<UserType>,
) -> Result<(), StatusCode> {
    let realm = claims
        .realm_access
        .as_ref()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if any role in claims matches any allowed role
    let has_role = realm
        .roles
        .iter()
        .any(|r| UserType::from_str(r).is_ok_and(|parsed| allowed_roles.contains(&parsed)));

    if has_role {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
