use crate::{
    config::{self, AppState},
    types::Category,
};
use clap::Parser;
use init_utils::fetch_jwks;
use mongodb::{
    Client, Database, IndexModel,
    bson::{Bson, doc, oid::ObjectId},
    options::{IndexOptions, UpdateOptions},
};
use std::{collections::HashMap, path::Path, sync::Arc};

pub async fn ensure_category_index(db: &Database) -> mongodb::error::Result<()> {
    let col = db.collection::<Category>("categories");

    let index_model = IndexModel::builder()
        .keys(doc! {
            "label": 1,
            "parent_id": 1
        })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    col.create_index(index_model).await?;

    Ok(())
}

pub async fn init_mongo_collections(db: &Database) -> Result<(), mongodb::error::Error> {
    for name in &["goods", "categories", "basket"] {
        let existing = db.list_collection_names().await?;

        if !existing.contains(&name.to_string()) {
            db.create_collection(*name).await?;
            println!("Created collection: {}", name);
        } else {
            println!("Collection already exists: {}", name);
        }
    }

    Ok(())
}

// Upsert single category and return the actual _id
async fn upsert_category_id(
    col: &mongodb::Collection<Category>,
    label: &str,
    parent_id: Option<ObjectId>,
) -> mongodb::error::Result<ObjectId> {
    let parent_bson = parent_id.map(Bson::ObjectId).unwrap_or(Bson::Null);

    let filter = doc! {
        "label": label,
        "parent_id": &parent_bson
    };

    let update = doc! { "$setOnInsert": { "label": label, "parent_id": &parent_bson } };
    let opts = UpdateOptions::builder().upsert(true).build();

    let res = col
        .update_one(filter.clone(), update)
        .with_options(opts)
        .await?;
    if let Some(Bson::ObjectId(id)) = res.upserted_id {
        Ok(id)
    } else {
        // already exists — take _id
        let existing = col
            .find_one(filter)
            .await?
            .expect("Category exists but not found");
        Ok(existing.id)
    }
}

pub async fn init_categories(
    path: &str,
    db: &Database,
) -> mongodb::error::Result<()> {
    if !Path::new(path).exists() {
        panic!("Can't find categories.json at {}", path);
    }

    let data = std::fs::read_to_string(path).expect("Can't read categories.json");
    let parsed: HashMap<String, Vec<String>> = serde_json::from_str(&data).expect("Invalid JSON");

    let col = db.collection::<Category>("categories");

    ensure_category_index(db).await?;

    // first create/find parent, then children
    for (parent_label, children) in parsed {
        // upsert parent
        let parent_id = upsert_category_id(&col, &parent_label, None).await?;

        // upsert children
        for child_label in children {
            upsert_category_id(&col, &child_label, Some(parent_id)).await?;
        }
    }

    Ok(())
}

pub async fn init_app_state() -> Arc<AppState> {
    dotenv::dotenv().ok();

    let config = Arc::new(config::AppConfig::parse());

    let client = reqwest::Client::new();
    let jwks = fetch_jwks(
        &config.keycloak_cfg.keycloak_url,
        &config.keycloak_cfg.keycloak_realm,
        &client,
    )
    .await;
    let mongo_client = Client::with_uri_str(config.mongo_uri.clone())
        .await
        .expect("Can't init connection to mongodb");

    let db = mongo_client.database("emarket");

    init_mongo_collections(&db)
        .await
        .expect("Can't init mongo collections");
    init_categories(&config.collections_json, &db)
        .await
        .expect("Can't init categories collection");

    //  Init AppState
    Arc::new(AppState {
        config: Arc::clone(&config),
        jwks: Arc::new(jwks),
        mongodb: Arc::new(db),
    })
}
