use crate::types::{
    Basket, BasketGoodCompact, BasketInfoResponse, BasketResponse, Category, CategoryResponse,
    Good, GoodResponse,
};

impl From<Good> for GoodResponse {
    fn from(val: Good) -> Self {
        let id = val.id.map(|oid| oid.to_hex()).unwrap_or_default();
        let category_ids = val
            .category_ids
            .into_iter()
            .map(|oid| oid.to_hex())
            .collect::<Vec<String>>();

        GoodResponse {
            id,
            title: val.title,
            description: val.description,
            price: val.price,
            vendor_id: val.vendor_id,
            available: val.available,
            times_bought: val.times_bought,
            rating: val.rating,
            time_added: val.time_added,
            category_ids,
        }
    }
}

impl From<Basket> for BasketResponse {
    fn from(val: Basket) -> Self {
        let id = val.id.to_hex();
        let amount = val.goods.iter().map(|good| good.quantity as u64).sum();

        BasketResponse {
            id,
            amount,
            goods: val.goods,
        }
    }
}

impl From<Basket> for BasketInfoResponse {
    fn from(val: Basket) -> Self {
        use std::collections::HashMap;

        let amount = val.goods.iter().map(|good| good.quantity as u64).sum();

        let mut map: HashMap<String, u32> = HashMap::new();
        for good in val.goods {
            *map.entry(good.good_id.to_hex()).or_insert(0) += good.quantity;
        }

        let goods: Vec<BasketGoodCompact> = map
            .into_iter()
            .map(|(id, quantity)| BasketGoodCompact { quantity, id })
            .collect();

        BasketInfoResponse { amount, goods }
    }
}

impl From<Category> for CategoryResponse {
    fn from(val: Category) -> Self {
        let parent_id = val.parent_id.map(|oid| oid.to_hex());
        CategoryResponse {
            id: val.id.to_hex(),
            label: val.label,
            parent_id,
        }
    }
}
