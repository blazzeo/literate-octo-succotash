use crate::{config::KeycloakConfig, keycloak::types::Claims};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use cookie::time::Duration as CookieDuration;
use jsonwebtoken::{DecodingKey, Validation, decode, decode_header};
use middleware::types::Jwks;
use service_error::ServiceError;

pub fn validate_token(
    token_str: &str,
    jwks: &Jwks,
) -> Result<Claims, ServiceError> {
    let header = decode_header(token_str).map_err(|_| ServiceError::Unauthorized)?;
    let kid = header.kid.ok_or(ServiceError::Unauthorized)?;

    // Find matching key
    let jwk = jwks
        .keys
        .iter()
        .find(|k| k.kid == kid)
        .ok_or(ServiceError::Unauthorized)?;

    let decoding_key =
        DecodingKey::from_rsa_components(&jwk.n, &jwk.e).map_err(|_| ServiceError::Unauthorized)?;

    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);

    let claims =
        decode::<Claims>(token_str, &decoding_key, &validation).map_err(ServiceError::JWT)?;

    Ok(claims.claims)
}

pub fn build_auth_cookies(
    access_token: String,
    refresh_token: String,
    domain: &str,
    config: &KeycloakConfig,
) -> CookieJar {
    let access_cookie = build_access_cookie(access_token, domain, config);
    let refresh_cookie = build_refresh_cookie(refresh_token, domain, config);
    let domain_cookie = build_domain_cookie(domain, config);

    CookieJar::new()
        .add(access_cookie)
        .add(refresh_cookie)
        .add(domain_cookie)
}

fn build_access_cookie(
    access_token: String,
    domain: &str,
    config: &KeycloakConfig,
) -> Cookie<'static> {
    build_cookie(
        "access_token".into(),
        access_token,
        domain,
        config.access_token_age_minutes,
    )
}

fn build_refresh_cookie(
    refresh_token: String,
    domain: &str,
    config: &KeycloakConfig,
) -> Cookie<'static> {
    let days_in_minutes = config.refresh_token_age_days * 60 * 24;
    build_cookie(
        "refresh_token".into(),
        refresh_token,
        domain,
        days_in_minutes,
    )
}

fn build_domain_cookie(
    domain: &str,
    config: &KeycloakConfig,
) -> Cookie<'static> {
    let days_in_minutes = config.refresh_token_age_days * 60 * 24;
    build_cookie("domain".into(), domain.to_string(), domain, days_in_minutes)
}

fn build_cookie(
    token_type: String,
    token: String,
    domain: &str,
    max_age: i64,
) -> Cookie<'static> {
    //  Extract the main domain (e.g., "emarket.com" from "auth.emarket.com")
    let cookie_domain = if domain.contains('.') {
        let parts: Vec<&str> = domain.split('.').collect();
        if parts.len() >= 2 {
            format!(".{}", parts[parts.len() - 2..].join("."))
        } else {
            domain.to_string()
        }
    } else {
        domain.to_string()
    };

    Cookie::build((token_type, token))
        .domain(cookie_domain)
        .http_only(true)
        .secure(true)
        .path("/")
        .max_age(CookieDuration::minutes(max_age))
        .same_site(axum_extra::extract::cookie::SameSite::None)
        .build()
}

pub fn remove_auth_cookies(
    jar: CookieJar,
    domain: &str,
) -> CookieJar {
    let access_cookie = rm_cookie("access_token", domain);
    let refresh_cookie = rm_cookie("refresh_token", domain);
    let domain_cookie = rm_cookie("domain", domain);

    jar.remove(access_cookie)
        .remove(refresh_cookie)
        .remove(domain_cookie)
}

fn rm_cookie(
    token_type: &str,
    domain: &str,
) -> Cookie<'static> {
    //  Extract the main domain (e.g., "emarket.com" from "auth.emarket.com")
    let cookie_domain = if domain.contains('.') {
        let parts: Vec<&str> = domain.split('.').collect();
        if parts.len() >= 2 {
            format!(".{}", parts[parts.len() - 2..].join("."))
        } else {
            domain.to_string()
        }
    } else {
        domain.to_string()
    };

    Cookie::build((token_type.to_owned(), ""))
        .domain(cookie_domain)
        .http_only(true)
        .secure(true)
        .path("/")
        .max_age(time::Duration::seconds(0))
        .same_site(axum_extra::extract::cookie::SameSite::None)
        .build()
}
