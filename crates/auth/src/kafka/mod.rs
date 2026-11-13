pub mod utils;
use serde::Serialize;

#[derive(Serialize)]
struct CustomerPayload {
    id: String,
    username: String,
    email: String,
    first_name: String,
    last_name: String,
}

#[derive(Serialize)]
struct VendorPayload {
    id: String,
    username: String,
    email: String,
}
