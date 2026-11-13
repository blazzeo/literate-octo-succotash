use crate::entities::user::Model;
use crate::entities::{prelude::*, *};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
};
use service_error::ServiceError;

pub async fn get_user_data(
    id: &str,
    db: &DatabaseConnection,
) -> Result<Model, ServiceError> {
    let user = User::find_by_id(id).one(db).await?;

    user.ok_or_else(|| ServiceError::NotFound("Vendor not found".into()))
}

pub async fn update_user_data(
    id: &str,
    user: &Model,
    db: &DatabaseConnection,
) -> Result<Model, ServiceError> {
    let existing_user = User::find()
        .filter(user::Column::Id.eq(id))
        .one(db)
        .await?
        .ok_or(ServiceError::NotFound("Vendor not found".into()))?;

    let mut active: user::ActiveModel = existing_user.into();

    active.login = Set(user.login.clone());
    active.billing_address = Set(user.billing_address.clone());
    active.wallets = Set(user.wallets.clone());

    let updated = active.update(db).await?;

    Ok(updated)
}
