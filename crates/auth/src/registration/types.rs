use serde::{Deserialize, Serialize};
use std::str::FromStr;
use validator::Validate;

#[derive(Deserialize)]
pub struct NewPasswordJson {
    pub new_password: String,
}

#[derive(Deserialize)]
pub struct VerifyTokenParams {
    pub token: String,
}

#[derive(Serialize, Deserialize)]
pub struct EmailJson {
    pub email: String,
}

#[derive(Serialize, Deserialize)]
pub enum UserType {
    Customer,
    Vendor,
    Admin,
}

impl std::fmt::Display for UserType {
    fn fmt(
        &self,
        f: &mut std::fmt::Formatter<'_>,
    ) -> std::fmt::Result {
        write!(f, "{}", self.to_str())
    }
}

impl FromStr for UserType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "vendor" => Ok(UserType::Vendor),
            "customer" => Ok(UserType::Customer),
            "admin" => Ok(UserType::Admin),
            _ => Err(format!("Invalid user type: {}", s)),
        }
    }
}

impl UserType {
    pub fn to_str(&self) -> &'static str {
        match self {
            UserType::Customer => "customer",
            UserType::Vendor => "vendor",
            UserType::Admin => "admin",
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub enum UserInfoEnum {
    Customer(CustomerInfo),
    Vendor(VendorInfo),
    Admin(AdminInfo),
}

impl UserInfo for UserInfoEnum {
    fn username(&self) -> &str {
        match self {
            UserInfoEnum::Customer(c) => c.username(),
            UserInfoEnum::Vendor(v) => v.username(),
            UserInfoEnum::Admin(a) => a.username(),
        }
    }

    fn first_name(&self) -> &Option<String> {
        match self {
            UserInfoEnum::Customer(c) => c.first_name(),
            UserInfoEnum::Vendor(v) => v.first_name(),
            UserInfoEnum::Admin(a) => a.first_name(),
        }
    }

    fn last_name(&self) -> &Option<String> {
        match self {
            UserInfoEnum::Customer(c) => c.last_name(),
            UserInfoEnum::Vendor(v) => v.last_name(),
            UserInfoEnum::Admin(a) => a.last_name(),
        }
    }

    fn credentials(&self) -> &UserCredentials {
        match self {
            UserInfoEnum::Customer(c) => c.credentials(),
            UserInfoEnum::Vendor(v) => v.credentials(),
            UserInfoEnum::Admin(a) => a.credentials(),
        }
    }

    fn roles(&self) -> Vec<String> {
        match self {
            UserInfoEnum::Customer(c) => c.roles(),
            UserInfoEnum::Vendor(v) => v.roles(),
            UserInfoEnum::Admin(a) => a.roles(),
        }
    }

    fn user_type(&self) -> UserType {
        match self {
            UserInfoEnum::Customer(_) => UserType::Customer,
            UserInfoEnum::Vendor(_) => UserType::Vendor,
            UserInfoEnum::Admin(_) => UserType::Admin,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct UserVerificationParams {
    pub user_info: UserInfoEnum,
}

pub trait UserInfo {
    fn credentials(&self) -> &UserCredentials;
    fn username(&self) -> &str;
    fn first_name(&self) -> &Option<String>;
    fn last_name(&self) -> &Option<String>;
    fn roles(&self) -> Vec<String>;
    fn user_type(&self) -> UserType;
}

#[derive(Serialize, Deserialize, Debug, Validate)]
pub struct UserCredentials {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Serialize, Deserialize, Validate, Debug)]
pub struct VendorInfo {
    pub credentials: UserCredentials,
    #[validate(length(min = 4))]
    pub username: String,
}

#[derive(Serialize, Deserialize, Validate, Debug)]
pub struct AdminInfo {
    pub credentials: UserCredentials,
    #[validate(length(min = 4))]
    pub username: String,
}

impl UserInfo for AdminInfo {
    fn credentials(&self) -> &UserCredentials {
        &self.credentials
    }
    fn username(&self) -> &str {
        &self.username
    }
    fn first_name(&self) -> &Option<String> {
        &None
    }
    fn last_name(&self) -> &Option<String> {
        &None
    }
    fn roles(&self) -> Vec<String> {
        vec!["admin".into()]
    }
    fn user_type(&self) -> UserType {
        UserType::Admin
    }
}

impl UserInfo for VendorInfo {
    fn credentials(&self) -> &UserCredentials {
        &self.credentials
    }
    fn username(&self) -> &str {
        &self.username
    }
    fn first_name(&self) -> &Option<String> {
        &None
    }
    fn last_name(&self) -> &Option<String> {
        &None
    }
    fn roles(&self) -> Vec<String> {
        vec!["vendor".into()]
    }
    fn user_type(&self) -> UserType {
        UserType::Vendor
    }
}

#[derive(Serialize, Deserialize, Validate, Debug)]
pub struct CustomerInfo {
    pub credentials: UserCredentials,
    #[validate(length(min = 4))]
    pub username: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

impl UserInfo for CustomerInfo {
    fn credentials(&self) -> &UserCredentials {
        &self.credentials
    }
    fn username(&self) -> &str {
        &self.username
    }
    fn first_name(&self) -> &Option<String> {
        &self.first_name
    }
    fn last_name(&self) -> &Option<String> {
        &self.last_name
    }
    fn roles(&self) -> Vec<String> {
        vec!["customer".into()]
    }
    fn user_type(&self) -> UserType {
        UserType::Customer
    }
}

#[derive(Serialize)]
pub struct UserMe {
    pub id: String,
    pub name: String,
    pub login: String,
    pub email: String,
    pub role: String,
}
