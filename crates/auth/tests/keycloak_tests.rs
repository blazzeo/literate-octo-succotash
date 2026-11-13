use auth::config::KeycloakConfig;
use auth::registration::services::{check_available_email, check_available_login};
use auth::{
    keycloak::{types, utils},
    registration,
};
use keycloak::types::{CredentialRepresentation, UserRepresentation};
use service_error::ServiceError;

const URL: &str = "http://127.0.0.1:8080";
const USERNAME: &str = "admin";
const PASSWORD: &str = "super_admin";
const REALM: &str = "emarket";
const CLIENT_ID: &str = "auth";
const SECRET: &str = "**********";

const TEST_USER_NAME: &str = "test123";
const TEST_USER_PASS: &str = "qwer123";
const TEST_USER_EMAIL: &str = "test_user_123@test.com";

#[ignore = "It's ok"]
#[tokio::test]
async fn test_admin_get_users() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let users = admin
        .realm_users_get(
            REALM,
            None,
            None,
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await;

    assert!(users.is_ok())
}

#[ignore = "Muted due to test on authorization test"]
#[tokio::test]
async fn test_admin_users_api() {
    // create user
    test_admin_create_user().await;
    // set users password
    test_admin_set_user_password().await;
    // delete user
    test_admin_delete_user().await;
}

async fn test_admin_create_user() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let user_info = registration::types::CustomerInfo {
        credentials: registration::types::UserCredentials {
            email: TEST_USER_EMAIL.into(),
            password: TEST_USER_PASS.into(),
        },
        username: TEST_USER_NAME.into(),
        first_name: Some("Test".into()),
        last_name: Some("Test".into()),
    };

    let response = admin
        .realm_users_post(
            REALM,
            UserRepresentation {
                email: Some(user_info.credentials.email),
                email_verified: Some(true),
                enabled: Some(true),
                first_name: user_info.first_name,
                last_name: user_info.last_name,
                username: Some(user_info.username),
                ..Default::default()
            },
        )
        .await;

    assert!(response.is_ok())
}

async fn test_admin_delete_user() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let users = admin
        .realm_users_get(
            REALM,
            None,
            None,
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .expect("Can't get users");

    let user = users
        .iter()
        .find(|u| u.username == Some(TEST_USER_NAME.into()))
        .expect("Didn't find such user");

    let user_id = user.id.clone().unwrap();

    let response = admin.realm_users_with_user_id_delete(REALM, &user_id).await;

    assert!(response.is_ok())
}

#[ignore = "It's ok"]
#[tokio::test]
async fn test_user_id() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let users = admin
        .realm_users_get(
            REALM,
            None,
            None,
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .expect("Can't get users");

    for user in users.iter() {
        println!("{:?} – {:?}", user.id, user.email);
    }
}

async fn test_admin_set_user_password() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let users = admin
        .realm_users_get(
            REALM,
            None,
            None,
            Some(true),
            Some(true),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .expect("Can't get users");

    let user = users
        .iter()
        .find(|u| u.username == Some(TEST_USER_NAME.into()))
        .expect("Didn't find such user");

    let user_id = user.id.clone().unwrap();

    let response = admin
        .realm_users_with_user_id_reset_password_put(
            REALM,
            &user_id,
            CredentialRepresentation {
                type_: Some("password".into()),
                value: Some(TEST_USER_PASS.into()),
                temporary: Some(false),
                ..Default::default()
            },
        )
        .await;

    assert!(response.is_ok())
}

async fn test_authenticate() -> Result<types::TokenResponse, ServiceError> {
    let credentials = registration::types::UserCredentials {
        email: TEST_USER_EMAIL.into(),
        password: TEST_USER_PASS.into(),
    };

    let config = auth::config::KeycloakConfig {
        url: URL.into(),
        realm: REALM.into(),
        admin_name: USERNAME.into(),
        admin_pass: PASSWORD.into(),
        client_id: CLIENT_ID.into(),
        client_secret: SECRET.into(),
        refresh_token_age_days: 1,
        access_token_age_minutes: 1,
    };

    utils::authenticate(&credentials, &config, &reqwest::Client::new()).await
}

#[ignore = "It's ok"]
#[tokio::test]
async fn test_authorization() -> Result<(), ServiceError> {
    // Create user
    test_admin_create_user().await;

    // Set user password
    test_admin_set_user_password().await;

    // Test authorization
    let result = test_authenticate().await;

    if let Err(e) = &result {
        eprintln!("Authorization error: {}", e);
    }

    // Cleanup: Delete user
    test_admin_delete_user().await;

    // Assert success
    result.map(|_| ()) // Converts Result<T, E> to Result<(), E>
}

#[tokio::test]
async fn test_available_login() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let cfg = KeycloakConfig {
        url: URL.into(),
        realm: REALM.into(),
        admin_name: USERNAME.into(),
        admin_pass: PASSWORD.into(),
        client_id: CLIENT_ID.into(),
        client_secret: SECRET.into(),
        refresh_token_age_days: 10,
        access_token_age_minutes: 30,
    };

    dbg!(&cfg);

    let res = check_available_login("some_test_login".into(), &admin, &cfg)
        .await
        .expect("can't check login availability");

    assert!(res);
}

#[ignore = "It's ok"]
#[tokio::test]
async fn test_available_email() {
    let admin_token = utils::get_admin_token(
        USERNAME,
        PASSWORD,
        REALM,
        CLIENT_ID,
        SECRET,
        reqwest::Client::new(),
    );

    let admin = keycloak::KeycloakAdmin::new(URL, admin_token, reqwest::Client::new());

    let cfg = KeycloakConfig {
        url: URL.into(),
        realm: REALM.into(),
        admin_name: USERNAME.into(),
        admin_pass: PASSWORD.into(),
        client_id: CLIENT_ID.into(),
        client_secret: SECRET.into(),
        refresh_token_age_days: 10,
        access_token_age_minutes: 20,
    };

    let res = check_available_email("blazzuka@gmail.com".into(), &admin, &cfg)
        .await
        .expect("can't check login availability");

    assert!(res);
}
