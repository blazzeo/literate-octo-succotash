use redis::{AsyncCommands, FromRedisValue, aio::Connection};
use serde::{Serialize, de::DeserializeOwned};
use service_error::ServiceError;

pub struct UserTokenRepository {
    client: redis::Client,
}

impl UserTokenRepository {
    pub fn new(redis_url: &str) -> Self {
        Self {
            client: redis::Client::open(redis_url).expect("Can't open redis connection"),
        }
    }

    async fn connect(&self) -> Result<Connection, ServiceError> {
        self.client
            .get_async_connection()
            .await
            .map_err(|e| ServiceError::Internal(format!("Redis connection error: {}", e)))
    }

    pub async fn save_token<T>(
        &self,
        params: T,
        token: &str,
        ttl_hours: u64,
    ) -> Result<(), ServiceError>
    where
        T: Sized + Serialize,
    {
        let mut conn = self.connect().await?;

        let serialized_params = serde_json::to_string(&params)
            .map_err(|e| ServiceError::Internal(format!("Serialization failed: {}", e)))?;

        let _: () = conn
            .set_ex(token, serialized_params, ttl_hours * 3600)
            .await
            .map_err(|e| ServiceError::Internal(format!("Redis SET error: {}", e)))?;

        Ok(())
    }

    pub async fn verify_token<T>(
        &self,
        token: &str,
    ) -> Result<T, ServiceError>
    where
        T: Serialize + DeserializeOwned,
    {
        let mut conn = self.connect().await?;

        let result: redis::Value = conn
            .get(token)
            .await
            .map_err(|e| ServiceError::Internal(format!("Redis GET error: {}", e)))?;

        match result {
            redis::Value::Nil => Err(ServiceError::NotFound("Token not found".to_string())),
            _ => {
                let string_val: String =
                    FromRedisValue::from_redis_value(&result).map_err(|e| {
                        ServiceError::Internal(format!("Redis value decode error: {}", e))
                    })?;
                let params: T = serde_json::from_str(&string_val)
                    .map_err(|e| ServiceError::Internal(format!("JSON decode error: {}", e)))?;
                Ok(params)
            },
        }
    }

    pub async fn delete_token(
        &self,
        token: &str,
    ) -> Result<(), ServiceError> {
        let mut conn = self.connect().await?;

        let _: () = conn
            .del(token)
            .await
            .map_err(|e| ServiceError::Internal(format!("Redis DEL error: {}", e)))?;

        Ok(())
    }
}
