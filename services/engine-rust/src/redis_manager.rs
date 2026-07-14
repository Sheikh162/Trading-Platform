use redis::AsyncCommands;
use crate::types::{DbMessage, MessageFromEngine, WsPublishMessage};
use crate::errors::EngineError;

// =========================================================================
// 1. CACHE CLIENT CONTROLLER
// =========================================================================

/// Connection manager for publishing updates and database synchronizations via Redis.
#[derive(Clone)]
pub struct RedisManager {
    conn: redis::aio::MultiplexedConnection,
}

// =========================================================================
// 2. PUBLIC REDIS ACTIONS (Top-Down Layout, Single Line Signatures)
// =========================================================================

impl RedisManager {
    /// Connects to a target Redis instance
    pub async fn new(redis_url: &str) -> Result<Self, EngineError> {
        let client = redis::Client::open(redis_url)?;
        let conn = client.get_multiplexed_tokio_connection().await?;
        Ok(Self { conn })
    }

    /// Pushes events into the SQL database logger queue ("db_processor")
    pub fn push_to_db_processor(&self, message: DbMessage) {
        let mut conn = self.conn.clone();
        if let Ok(payload) = serde_json::to_string(&message) {
            tokio::spawn(async move {
                let _: Result<(), redis::RedisError> = conn.lpush("db_processor", payload).await;
            });
        }
    }

    /// Publishes live ticker/depth events to WS streams (e.g. "depth@BTC_USDT")
    pub fn publish_ws_message(&self, channel: &str, message: WsPublishMessage) {
        let mut conn = self.conn.clone();
        let chan = channel.to_string();
        if let Ok(payload) = serde_json::to_string(&message) {
            tokio::spawn(async move {
                let _: Result<(), redis::RedisError> = conn.publish(chan, payload).await;
            });
        }
    }

    /// Delivers responses back to matching client queues
    pub fn send_to_api(&self, client_id: &str, message: MessageFromEngine) {
        let mut conn = self.conn.clone();
        let queue = client_id.to_string();
        if let Ok(payload) = serde_json::to_string(&message) {
            tokio::spawn(async move {
                let _: Result<(), redis::RedisError> = conn.publish(queue, payload).await;
            });
        }
    }
}