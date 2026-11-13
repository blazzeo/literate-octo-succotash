use crate::{
    config::AppState,
    router_types::{BasketIdParam, BasketPageAmountParam, GoodIdParam, GoodsPageAmountParam},
    types::{BasketGood, BasketInfoResponse, CategoryResponse, Filters, Good, GoodResponse},
};
use axum::extract::{Json, Query, State};
use middleware::ClaimsExtension;
use service_error::ServiceError;
use std::sync::Arc;

pub mod services;

pub async fn get_good(
    GoodIdParam { good_id }: GoodIdParam,
    State(state): State<Arc<AppState>>,
) -> Result<Json<GoodResponse>, ServiceError> {
    let good = services::get_good(&state.mongodb, &good_id).await?;

    Ok(Json(good.into()))
}

pub async fn get_goods_amount(
    State(state): State<Arc<AppState>>,
    filters: Query<Filters>,
) -> Result<Json<i32>, ServiceError> {
    let goods_amount = services::get_goods_amount(&state.mongodb, &filters).await?;

    Ok(Json(goods_amount))
}

pub async fn add_good(
    State(state): State<Arc<AppState>>,
    Json(good): Json<Good>,
) -> Result<Json<String>, ServiceError> {
    let good_id = services::add_good(&state.mongodb, good).await?;

    Ok(Json(good_id))
}

pub async fn update_good(
    GoodIdParam { good_id }: GoodIdParam,
    State(state): State<Arc<AppState>>,
    Json(good): Json<Good>,
) -> Result<Json<bool>, ServiceError> {
    services::update_good(&state.mongodb, &good_id, good).await?;

    Ok(Json(true))
}

pub async fn delete_good(
    GoodIdParam { good_id }: GoodIdParam,
    State(state): State<Arc<AppState>>,
) -> Result<Json<bool>, ServiceError> {
    services::delete_good(&state.mongodb, &good_id).await?;

    Ok(Json(true))
}

pub async fn goods_with_filters(
    GoodsPageAmountParam { page, amount }: GoodsPageAmountParam,
    State(state): State<Arc<AppState>>,
    filters: Query<Filters>,
) -> Result<Json<Vec<GoodResponse>>, ServiceError> {
    let goods = services::goods_with_filters(&state.mongodb, page, amount, &filters).await?;

    let response: Vec<GoodResponse> = goods.into_iter().map(|good| good.into()).collect();

    Ok(Json(response))
}

pub async fn get_basket(
    BasketPageAmountParam { page, amount }: BasketPageAmountParam,
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
) -> Result<Json<Vec<BasketGood>>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;

    let goods = services::get_basket(&state.mongodb, &user_id, page, amount).await?;

    Ok(Json(goods))
}

pub async fn add_basket(
    BasketIdParam { good_id }: BasketIdParam,
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
) -> Result<Json<bool>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;

    services::add_basket(&state.mongodb, &user_id, &good_id).await?;

    Ok(Json(true))
}

pub async fn delete_basket(
    BasketIdParam { good_id }: BasketIdParam,
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
) -> Result<Json<bool>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;

    services::delete_basket(&state.mongodb, &good_id, &user_id).await?;

    Ok(Json(true))
}

pub async fn get_categories(
    State(state): State<Arc<AppState>>
) -> Result<Json<Vec<CategoryResponse>>, ServiceError> {
    let categories = services::get_categories(&state.mongodb).await?;

    let response: Vec<CategoryResponse> = categories.into_iter().map(|cat| cat.into()).collect();

    Ok(Json(response))
}

pub async fn info_basket(
    State(state): State<Arc<AppState>>,
    ClaimsExtension(claims, _user_type): ClaimsExtension,
) -> Result<Json<BasketInfoResponse>, ServiceError> {
    let user_id = claims.sub.ok_or_else(|| ServiceError::Unauthorized)?;

    let basket = services::info_basket(&state.mongodb, &user_id).await?;

    Ok(Json(basket))
}
