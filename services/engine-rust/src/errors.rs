/// Core error handler enum for the matching engine service.
/// Utilizes the `thiserror` crate to write descriptive error conversions dynamically.
#[derive(thiserror::Error, Debug)]
pub enum EngineError {
    #[error("Redis I/O error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("PostgreSQL database query failure: {0}")]
    Database(#[from] sqlx::Error),

    #[error("JSON parse/format failure: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Insufficient funds for user {user_id} in asset {asset}. Required: {required:.4}, Available: {available:.4}")]
    InsufficientFunds {
        user_id: String,
        asset: String,
        required: f64,
        available: f64,
    },

    #[error("User financial storage not initialized for user_id: {0}")]
    UserNotFound(String),

    #[error("Matching engine orderbook not found for trading pair: {0}")]
    OrderbookNotFound(String),

    #[error("Cancel target order {0} not found in active orderbooks")]
    OrderNotFound(String),
}
