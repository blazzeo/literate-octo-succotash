use axum_extra::routing::TypedPath;
use serde::Deserialize;

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/goods/{good_id}")]
pub struct GoodIdParam {
    pub good_id: String,
}

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/goods/{page}/{amount}")]
pub struct GoodsPageAmountParam {
    pub page: i32,
    pub amount: i32,
}

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/basket/{good_id}")]
pub struct BasketIdParam {
    pub good_id: String,
}

#[derive(Deserialize, TypedPath)]
#[typed_path("/api/basket/{page}/{amount}")]
pub struct BasketPageAmountParam {
    pub page: i32,
    pub amount: i32,
}
