use crate::types::{
    Basket, BasketGood, BasketGoodCompact, BasketInfoResponse, Category, Filters, Good,
};
use mongodb::{
    Database,
    bson::{DateTime, Document, Regex, doc, oid::ObjectId, to_document},
    options::{FindOptions, UpdateOptions},
};
use service_error::ServiceError;

pub async fn add_good(
    db: &Database,
    mut good: Good,
) -> Result<String, ServiceError> {
    let collection = db.collection::<Good>("goods");

    let good_id = ObjectId::new();

    good.id = Some(good_id);
    good.time_added = DateTime::now();

    collection.insert_one(good).await?;

    Ok(good_id.to_hex())
}

pub async fn get_good(
    db: &Database,
    good_id: &str,
) -> Result<Good, ServiceError> {
    let collection = db.collection::<Good>("goods");

    let obj_id = ObjectId::parse_str(good_id).map_err(|_| ServiceError::BadRequest)?;

    let filter = doc! { "_id": obj_id };

    let good = collection.find_one(filter).await?;

    match good {
        Some(good_doc) => Ok(good_doc),
        None => Err(ServiceError::NotFound("Good not found".into())),
    }
}

pub async fn update_good(
    db: &Database,
    good_id: &str,
    good: Good,
) -> Result<(), ServiceError> {
    let collection = db.collection::<Good>("goods");

    let obj_id = ObjectId::parse_str(good_id).map_err(|_| ServiceError::BadRequest)?;

    let filter = doc! { "_id": obj_id };

    // Cenvert Good into bson::Document
    let mut update_doc = to_document(&good)
        .map_err(|_| ServiceError::Internal("Can't convert good to bson".into()))?;

    update_doc.remove("_id");

    let update = doc! { "$set": update_doc };

    collection
        .update_one(filter, update)
        .await
        .map_err(|_| ServiceError::Internal("Can't update good".into()))?;

    Ok(())
}

pub async fn delete_good(
    db: &Database,
    id: &str,
) -> Result<(), ServiceError> {
    let collection = db.collection::<Good>("goods");

    // Convert id string to ObjectId
    let obj_id = ObjectId::parse_str(id).map_err(|_| ServiceError::BadRequest)?;

    let filter = doc! { "_id": obj_id };

    let result = collection.delete_one(filter).await?;
    if result.deleted_count == 0 {
        return Err(ServiceError::NotFound("Good not found".into()));
    }

    Ok(())
}

pub async fn add_basket(
    db: &Database,
    customer_id: &str,
    good_id: &str,
) -> Result<(), ServiceError> {
    let basket_collection = db.collection::<Basket>("basket");

    let good_obj_id = ObjectId::parse_str(good_id).map_err(|_| ServiceError::BadRequest)?;

    // try to inc quantity, if good_id exists
    let filter = doc! {
        "customer_id": customer_id,
        "goods.good_id": &good_obj_id
    };
    let update = doc! {
        "$inc": { "goods.$.quantity": 1 }
    };

    let result = basket_collection
        .update_one(filter.clone(), update)
        .await
        .map_err(ServiceError::Mongo)?;

    if result.matched_count == 0 {
        //  add new good if no good was found
        let filter = doc! { "customer_id": customer_id };
        let update = doc! {
            "$push": {
                "goods": {
                    "good_id": &good_obj_id,
                    "quantity": 1
                }
            }
        };
        let options = UpdateOptions::builder().upsert(true).build();

        basket_collection
            .update_one(filter, update)
            .with_options(options)
            .await
            .map_err(ServiceError::Mongo)?;
    }

    Ok(())
}

pub async fn get_basket(
    db: &Database,
    user_id: &str,
    page: i32,
    amount: i32,
) -> Result<Vec<BasketGood>, ServiceError> {
    let goods_collection = db.collection::<Good>("goods");
    let basket_collection = db.collection::<Basket>("basket");

    let page = page.max(0);
    let amount = amount.clamp(1, 100);

    let filter = doc! { "customer_id": user_id };

    let basket_doc = basket_collection
        .find_one(filter)
        .await?
        .ok_or(ServiceError::NotFound("No basket found".into()))?;

    let goods_ids: Vec<ObjectId> = basket_doc.goods.iter().map(|item| item.good_id).collect();

    let filter = doc! { "_id": { "$in": &goods_ids } };

    let options = FindOptions::builder()
        .skip((page * amount) as u64)
        .limit(amount as i64)
        .sort(doc! { "time_added": -1 })
        .build();

    let mut cursor = goods_collection.find(filter).with_options(options).await?;
    let mut goods = Vec::new();

    while cursor.advance().await? {
        let good: Good = cursor.deserialize_current()?;
        if let Some(item) = basket_doc
            .goods
            .iter()
            .find(|i| i.good_id == good.id.unwrap())
        {
            goods.push(BasketGood {
                good: good.into(),
                quantity: item.quantity,
            });
        }
    }

    Ok(goods)
}

pub async fn delete_basket(
    db: &Database,
    good_id: &str,
    user_id: &str,
) -> Result<(), ServiceError> {
    let basket_collection = db.collection::<Basket>("basket");

    let good_obj_id = ObjectId::parse_str(good_id).map_err(|_| ServiceError::BadRequest)?;

    // Найдём корзину с нужным товаром
    let basket = basket_collection
        .find_one(doc! { "customer_id": user_id, "goods.good_id": &good_obj_id })
        .await?
        .ok_or_else(|| ServiceError::NotFound("No basket found".into()))?;

    // Найдём сам товар внутри goods
    if let Some(item) = basket.goods.iter().find(|g| g.good_id == good_obj_id) {
        if item.quantity > 1 {
            // Уменьшаем количество
            let result = basket_collection
                .update_one(
                    doc! { "customer_id": user_id, "goods.good_id": &good_obj_id },
                    doc! { "$inc": { "goods.$.quantity": -1 } },
                )
                .await?;

            if result.matched_count == 0 {
                return Err(ServiceError::NotFound("No basket found".into()));
            }
        } else {
            // Удаляем товар полностью
            let result = basket_collection
                .update_one(
                    doc! { "customer_id": user_id },
                    doc! { "$pull": { "goods": { "good_id": &good_obj_id } } },
                )
                .await?;

            if result.matched_count == 0 {
                return Err(ServiceError::NotFound("No basket found".into()));
            }
        }
    } else {
        return Err(ServiceError::NotFound("Good not found in basket".into()));
    }

    Ok(())
}

pub async fn get_categories(db: &Database) -> Result<Vec<Category>, ServiceError> {
    let categories_collection = db.collection::<Category>("categories");

    let mut cursor = categories_collection.find(Document::new()).await?;

    let mut categories_vec = Vec::<Category>::new();

    while cursor.advance().await? {
        let category = cursor.deserialize_current()?;
        categories_vec.push(category);
    }

    Ok(categories_vec)
}

pub async fn goods_with_filters(
    db: &Database,
    page: i32,
    amount: i32,
    filters: &Filters,
) -> Result<Vec<Good>, ServiceError> {
    let goods_collection = db.collection::<Good>("goods");

    let page = page.max(0);
    let amount = amount.clamp(1, 100);

    let mut filter_doc = doc! {};

    if let Some(name) = &filters.name {
        if !name.is_empty() {
            filter_doc.insert(
                "title",
                doc! {
                    "$regex": Regex { pattern: name.clone(), options: "i".to_string() } // "i" = case-insensitive
                },
            );
        }
    }

    let mut price_filter = doc! {};

    if let Some(min_price) = filters.min_price {
        if min_price != 0.0 {
            price_filter.insert("$gte", min_price);
        }
    }

    if let Some(max_price) = filters.max_price {
        if max_price != 0.0 {
            price_filter.insert("$lte", max_price);
        }
    }

    if !price_filter.is_empty() {
        filter_doc.insert("price", price_filter);
    }

    if let Some(vendor_id) = &filters.vendor_id {
        if !vendor_id.is_empty() {
            filter_doc.insert("vendor_id", vendor_id);
        }
    }

    if let Some(category_ids) = &filters.category_ids {
        if !category_ids.is_empty() {
            let category_ids_vec: Vec<String> =
                category_ids.split(',').map(|s| s.to_string()).collect();

            let cat_ids: Vec<ObjectId> = category_ids_vec
                .iter()
                .filter_map(|c| ObjectId::parse_str(c).ok())
                .collect();

            if !cat_ids.is_empty() {
                filter_doc.insert("category_ids", doc! { "$in": cat_ids });
            }
        }
    }

    let options = FindOptions::builder()
        .skip((page * amount) as u64)
        .limit(amount as i64)
        .sort(doc! { "time_added": -1 })
        .build();

    let mut cursor = goods_collection
        .find(filter_doc)
        .with_options(options)
        .await?;

    let mut goods = Vec::new();

    while cursor.advance().await? {
        let good = cursor.deserialize_current()?;
        goods.push(good);
    }

    Ok(goods)
}

pub async fn get_goods_amount(
    db: &Database,
    filters: &Filters,
) -> Result<i32, ServiceError> {
    let goods_collection = db.collection::<Good>("goods");

    let mut filter_doc = doc! {};

    if let Some(name) = &filters.name {
        if !name.is_empty() {
            filter_doc.insert(
                "title",
                doc! {
                    "$regex": Regex { pattern: name.clone(), options: "i".to_string() } // "i" = case-insensitive
                },
            );
        }
    }

    let mut price_filter = doc! {};

    if let Some(min_price) = filters.min_price {
        if min_price != 0.0 {
            price_filter.insert("$gte", min_price);
        }
    }

    if let Some(max_price) = filters.max_price {
        if max_price != 0.0 {
            price_filter.insert("$lte", max_price);
        }
    }

    if !price_filter.is_empty() {
        filter_doc.insert("price", price_filter);
    }

    if let Some(vendor_id) = &filters.vendor_id {
        if !vendor_id.is_empty() {
            filter_doc.insert("vendor_id", vendor_id);
        }
    }

    if let Some(categories) = &filters.category_ids {
        if !categories.is_empty() {
            let cat_ids: Vec<ObjectId> = categories
                .split(',')
                .filter_map(|c| ObjectId::parse_str(c).ok())
                .collect();

            if !cat_ids.is_empty() {
                filter_doc.insert("category_ids", doc! { "$in": cat_ids });
            }
        }
    }

    let count = goods_collection.count_documents(filter_doc).await?;

    Ok(count as i32)
}

pub async fn info_basket(
    db: &Database,
    user_id: &str,
) -> Result<BasketInfoResponse, ServiceError> {
    let basket_collection = db.collection::<Basket>("basket");

    let filter = doc! { "customer_id": &user_id };

    let result = basket_collection
        .find_one(filter.clone())
        .await?
        .ok_or_else(|| ServiceError::NotFound("Basket not found".into()))?;

    use std::collections::HashMap;

    let mut map: HashMap<String, u32> = HashMap::new();
    for good in result.goods.iter() {
        *map.entry(good.good_id.to_hex()).or_insert(0) += good.quantity;
    }

    let goods: Vec<BasketGoodCompact> = map
        .into_iter()
        .map(|(id, quantity)| BasketGoodCompact { quantity, id })
        .collect();

    let amount: u64 = goods.iter().map(|g| g.quantity as u64).sum();

    let basket_response = BasketInfoResponse { amount, goods };

    Ok(basket_response)
}
