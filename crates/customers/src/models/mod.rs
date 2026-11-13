use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CustomerInfo {
    pub id: i32,
    pub login: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub shipment_addresses: Option<Vec<String>>,
    pub billing_address: Option<String>,
    pub wallets: Option<Vec<String>>,
}
