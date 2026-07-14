use serde::{Deserialize, Deserializer, Serialize, Serializer};

// =========================================================================
// 1. HIGH-LEVEL API MESSAGE SEGMENTS (Entry & Exit Points)
// =========================================================================

/// Actions popped from the primary Redis queue ("messages") wrapped in an envelope
#[derive(Debug, Clone, serde::Deserialize)]
pub struct RedisMessageEnvelope {
    #[serde(rename = "clientId")]
    pub client_id: String,
    pub message: MessageToEngine,
}

/// Actions popped from the primary Redis queue ("messages")
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum MessageToEngine {
    #[serde(rename = "USER_CREATED")]
    UserCreated(UserCreatedData),
    #[serde(rename = "CREATE_ORDER")]
    CreateOrder(CreateOrderData),
    #[serde(rename = "CANCEL_ORDER")]
    CancelOrder(CancelOrderData),
    #[serde(rename = "ON_RAMP")]
    OnRamp(OnRampData),
    #[serde(rename = "WITHDRAW")]
    Withdraw(WithdrawData),
    #[serde(rename = "GET_DEPTH")]
    GetDepth(GetDepthData),
    #[serde(rename = "GET_OPEN_ORDERS")]
    GetOpenOrders(GetOpenOrdersData),
    #[serde(rename = "GET_BALANCE")]
    GetBalance(GetBalanceData),
}

/// Instant replies returned to API routers via Redis client subscription IDs
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum MessageFromEngine {
    #[serde(rename = "USER_CREATED")]
    UserCreated {
        #[serde(rename = "userId")]
        user_id: String,
    },
    #[serde(rename = "DEPTH")]
    Depth(DepthPayload),
    #[serde(rename = "ORDER_PLACED")]
    OrderPlaced(OrderPlacedPayload),
    #[serde(rename = "ORDER_CANCELLED")]
    OrderCancelled(OrderCancelledPayload),
    #[serde(rename = "OPEN_ORDERS")]
    OpenOrders(Vec<Order>),
    #[serde(rename = "GET_BALANCE")]
    GetBalance(GetBalancePayload),
}

/// Events dispatched to the DB sync processor queue ("db_processor")
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum DbMessage {
    #[serde(rename = "TRADE_ADDED")]
    TradeAdded(TradeAddedData),
    #[serde(rename = "ORDER_UPDATE")]
    OrderUpdate(OrderUpdateData),
}

/// Dynamic messages broadcasted outer-wards to market WS streams
#[derive(Debug, Clone, Serialize)]
pub struct WsPublishMessage {
    pub stream: String,
    #[serde(flatten)]
    pub payload: WsPublishMessagePayload,
}

// =========================================================================
// 2. SUPPORTING ACTION DATA STRUCTURES
// =========================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct UserCreatedData {
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOrderData {
    pub market: String,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num")]
    pub price: f64,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num")]
    pub quantity: f64,
    pub side: Side,
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CancelOrderData {
    #[serde(rename = "orderId")]
    pub order_id: String,
    pub market: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OnRampData {
    pub asset: String,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num")]
    pub amount: f64,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "txnId")]
    pub txn_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WithdrawData {
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num")]
    pub amount: f64,
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetDepthData {
    pub market: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetOpenOrdersData {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub market: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetBalanceData {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub asset: String,
}

// =========================================================================
// 3. SUPPORTING OUTGOING PAYLOADS
// =========================================================================

#[derive(Debug, Clone, Serialize)]
pub struct DepthPayload {
    pub market: Option<String>,
    pub bids: Vec<(String, String)>,
    pub asks: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderPlacedPayload {
    pub order_id: String,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub executed_qty: f64,
    pub fills: Vec<OrderPlacedFill>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderPlacedFill {
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub price: f64,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub qty: f64,
    pub trade_id: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderCancelledPayload {
    pub order_id: String,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub executed_qty: f64,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub remaining_qty: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GetBalancePayload {
    pub balance: String,
}

// =========================================================================
// 4. DATABASE & WS WORKER STRUCTURES
// =========================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TradeAddedData {
    pub id: String,
    pub is_buyer_maker: bool,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub price: f64,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub quantity: f64,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub quote_quantity: f64,
    pub timestamp: u64,
    pub market: String,
    pub maker_order_id: String,
    pub taker_order_id: String,
    pub maker_user_id: String,
    pub taker_user_id: String,
    pub buyer_user_id: String,
    pub seller_user_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderUpdateData {
    pub order_id: String,
    #[serde(skip_serializing_if = "Option::is_none", serialize_with = "serialize_opt_f64_to_str")]
    pub executed_qty: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", serialize_with = "serialize_opt_f64_to_str")]
    pub price: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", serialize_with = "serialize_opt_f64_to_str")]
    pub quantity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side: Option<Side>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "userId")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<OrderStatus>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum WsPublishMessagePayload {
    Ticker { data: WsTickerData },
    Depth { data: WsDepthData },
    Trade { data: WsTradeData },
}

#[derive(Debug, Clone, Serialize)]
pub struct WsTickerData {
    pub c: String,
    pub s: String,
    pub e: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsDepthData {
    pub b: Vec<(String, String)>,
    pub a: Vec<(String, String)>,
    pub e: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsTradeData {
    pub e: &'static str,
    pub t: u64,
    pub m: bool,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub p: f64,
    #[serde(serialize_with = "serialize_f64_to_str")]
    pub q: f64,
    pub s: String,
}

// =========================================================================
// 5. CORE DOMAIN DATA MODELS
// =========================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num", serialize_with = "serialize_f64_to_str")]
    pub price: f64,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num", serialize_with = "serialize_f64_to_str")]
    pub quantity: f64,
    pub order_id: String,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num", serialize_with = "serialize_f64_to_str")]
    pub filled: f64,
    pub side: Side,
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fill {
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num", serialize_with = "serialize_f64_to_str")]
    pub price: f64,
    #[serde(deserialize_with = "deserialize_f64_from_str_or_num", serialize_with = "serialize_f64_to_str")]
    pub qty: f64,
    pub trade_id: u64,
    pub other_user_id: String,
    pub maker_order_id: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Open,
    #[serde(rename = "partially_filled")]
    PartiallyFilled,
    Filled,
    Cancelled,
    Rejected,
}

// =========================================================================
// 6. LOW-LEVEL SERIALIZATION / PARSING ADAPTERS (Helpers at the Bottom)
// =========================================================================

pub fn deserialize_f64_from_str_or_num<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrNum {
        String(String),
        Float(f64),
    }

    match StringOrNum::deserialize(deserializer)? {
        StringOrNum::String(s) => s.trim().parse::<f64>().map_err(serde::de::Error::custom),
        StringOrNum::Float(f) => Ok(f),
    }
}

pub fn deserialize_opt_f64_from_str_or_num<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrNum {
        String(String),
        Float(f64),
        Null,
    }

    match StringOrNum::deserialize(deserializer)? {
        StringOrNum::String(s) => {
            let s_trimmed = s.trim();
            if s_trimmed.is_empty() {
                Ok(None)
            } else {
                s_trimmed.parse::<f64>().map(Some).map_err(serde::de::Error::custom)
            }
        }
        StringOrNum::Float(f) => Ok(Some(f)),
        StringOrNum::Null => Ok(None),
    }
}

pub fn serialize_f64_to_str<S>(value: &f64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_string())
}

pub fn serialize_opt_f64_to_str<S>(value: &Option<f64>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match value {
        Some(v) => serializer.serialize_str(&v.to_string()),
        None => serializer.serialize_none(),
    }
}
