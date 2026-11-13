use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};

mod utils;

#[derive(Deserialize)]
pub struct Filters {
    pub name: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub category_ids: Option<String>,
    pub vendor_id: Option<String>,
}

//  MongoTypes
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Good {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub vendor_id: String,
    pub available: bool,
    pub times_bought: i64,
    pub rating: f64,
    pub time_added: DateTime,
    pub category_ids: Vec<ObjectId>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Category {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub label: String,
    pub parent_id: Option<ObjectId>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Basket {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub customer_id: String,
    pub goods: Vec<BasketInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BasketInfo {
    pub good_id: ObjectId,
    pub quantity: u32,
}

//  HTTP Response Types
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GoodResponse {
    #[serde(rename = "_id")]
    pub id: String,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub vendor_id: String,
    pub available: bool,
    pub times_bought: i64,
    pub rating: f64,
    pub time_added: DateTime,
    pub category_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CategoryResponse {
    #[serde(rename = "_id")]
    pub id: String,
    pub label: String,
    pub parent_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BasketResponse {
    #[serde(rename = "_id")]
    pub id: String,
    pub amount: u64,
    pub goods: Vec<BasketInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BasketGoodCompact {
    #[serde(rename = "_id")]
    pub id: String,
    pub quantity: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BasketInfoResponse {
    pub amount: u64,
    pub goods: Vec<BasketGoodCompact>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BasketGood {
    pub good: GoodResponse,
    pub quantity: u32,
}
