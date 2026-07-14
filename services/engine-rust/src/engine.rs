use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use sqlx::{Pool, Postgres, Row};
use rand::{distributions::Alphanumeric, Rng};
use crate::types::{
    CancelOrderData, CreateOrderData, DbMessage, DepthPayload, Fill, GetBalancePayload,
    MessageFromEngine, MessageToEngine, Order, OrderCancelledPayload, OrderPlacedFill,
    OrderPlacedPayload, OrderUpdateData, Side, TradeAddedData, WsDepthData, WsPublishMessage,
    WsPublishMessagePayload, WsTickerData, WsTradeData, OrderStatus,
};
use crate::errors::EngineError;
use crate::orderbook::Orderbook;

pub const BASE_CURRENCY: &str = "USDT";

// =========================================================================
// 1. ENGINE RUNTIME STATE
// =========================================================================

/// In-memory asset storage balances for a user (unlocked vs locked in bids/asks)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserAssetBalance {
    pub available: f64,
    pub locked: f64,
}

/// Dynamic coordinator executing trades, updating ledger accounts, and executing db recoveries.
pub struct Engine {
    pub orderbooks: Vec<Orderbook>,
    pub balances: HashMap<String, HashMap<String, UserAssetBalance>>,
    pub snapshot_file: String,
    pub with_snapshot: bool,
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

// =========================================================================
// 2. ORCHESTRATOR IMPLEMENTATIONS (Top-Down Layout)
// =========================================================================

impl Engine {
    /// Instantiates the exchange state storage
    pub fn new() -> Self {
        let with_snapshot = std::env::var("WITH_SNAPSHOT").unwrap_or_else(|_| "false".to_string()) == "true";
        let snapshot_file = std::env::var("SNAPSHOT_FILE").unwrap_or_else(|_| "./snapshot.json".to_string());
        
        let mut engine = Self {
            orderbooks: Vec::new(),
            balances: HashMap::new(),
            snapshot_file,
            with_snapshot,
        };

        engine.load_snapshot();
        
        // If snapshot is disabled or empty, bootstrap default BTC market pair
        if engine.orderbooks.is_empty() {
            engine.orderbooks.push(Orderbook::new("BTC", Vec::new(), Vec::new(), 0, 0.0));
        }

        engine
    }

    /// Primary route handler. Processes popped events and executes matching, account credits, or API feedback.
    pub fn process(&mut self, message: MessageToEngine, client_id: &str, redis: &crate::redis_manager::RedisManager) {
        match message {
            MessageToEngine::UserCreated(data) => {
                self.create_user(&data.user_id);
                tracing::info!("User created in rust engine: {}", data.user_id);
            }
            MessageToEngine::CreateOrder(data) => {
                match self.create_order(data, redis) {
                    Ok((order_id, executed_qty, fills)) => {
                        let res = MessageFromEngine::OrderPlaced(OrderPlacedPayload {
                            order_id,
                            executed_qty,
                            fills,
                        });
                        redis.send_to_api(client_id, res);
                    }
                    Err(err) => {
                        tracing::error!("Create order transaction crash: {:?}", err);
                        let res = MessageFromEngine::OrderCancelled(OrderCancelledPayload {
                            order_id: String::new(),
                            executed_qty: 0.0,
                            remaining_qty: 0.0,
                        });
                        redis.send_to_api(client_id, res);
                    }
                }
            }
            MessageToEngine::CancelOrder(data) => {
                self.cancel_order(data, client_id, redis);
            }
            MessageToEngine::GetOpenOrders(data) => {
                self.get_open_orders(data, client_id, redis);
            }
            MessageToEngine::OnRamp(data) => {
                self.on_ramp(&data.user_id, &data.asset, data.amount);
            }
            MessageToEngine::Withdraw(data) => {
                if let Err(err) = self.withdraw(&data.user_id, data.amount) {
                    tracing::error!("Withdraw transaction abort: {:?}", err);
                }
            }
            MessageToEngine::GetDepth(data) => {
                self.get_depth(data, client_id, redis);
            }
            MessageToEngine::GetBalance(data) => {
                self.get_balance(data, client_id, redis);
            }
        }
    }

    /// Restores exchange books and balances states from PostgreSQL pools on cold starts
    pub async fn hydrate_from_db(&mut self, db_pool: &Pool<Postgres>) -> Result<(), EngineError> {
        // Query database configuration details
        let markets = sqlx::query("SELECT symbol FROM markets WHERE status = 'active' ORDER BY symbol")
            .fetch_all(db_pool)
            .await?;
        
        let balances = sqlx::query("SELECT user_id, asset, available::text, locked::text FROM balances ORDER BY user_id, asset")
            .fetch_all(db_pool)
            .await?;

        let open_orders = sqlx::query("SELECT id, user_id, market_symbol, side, price::text, quantity::text, filled_quantity::text FROM orders WHERE status IN ('open', 'partially_filled') ORDER BY created_at ASC")
            .fetch_all(db_pool)
            .await?;

        let trade_states = sqlx::query("
            SELECT DISTINCT ON (market_symbol)
                market_symbol,
                COALESCE(MAX((trade_id)::bigint) OVER (PARTITION BY market_symbol) + 1, 0)::int AS next_trade_id,
                price::text AS latest_price
            FROM trade_fills
            ORDER BY market_symbol, executed_at DESC
        ")
        .fetch_all(db_pool)
        .await?;

        // Format and load databases tables
        let market_symbols: Vec<String> = markets.iter().map(|row| row.get::<String, _>("symbol")).collect();
        let mut trade_state_map = HashMap::new();
        for row in trade_states {
            let symbol: String = row.get("market_symbol");
            let next_trade_id: i32 = row.get("next_trade_id");
            let latest_price_str: Option<String> = row.get("latest_price");
            let latest_price = latest_price_str.and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            trade_state_map.insert(symbol, (next_trade_id as u64, latest_price));
        }

        // Initialize markets orderbooks
        let mut restored_books = Vec::new();
        for symbol in &market_symbols {
            let base = symbol.split('_').next().unwrap_or("BTC");
            let (trade_id, price) = trade_state_map.get(symbol).cloned().unwrap_or((0, 0.0));
            restored_books.push(Orderbook::new(base, Vec::new(), Vec::new(), trade_id, price));
        }
        self.orderbooks = restored_books;

        // Restore balance sheets
        self.balances.clear();
        for row in balances {
            let user_id: String = row.get("user_id");
            let asset: String = row.get("asset");
            let avail_str: String = row.get("available");
            let lock_str: String = row.get("locked");
            
            let available = avail_str.parse::<f64>().unwrap_or(0.0);
            let locked = lock_str.parse::<f64>().unwrap_or(0.0);

            self.balances.entry(user_id)
                .or_insert_with(HashMap::new)
                .insert(asset, UserAssetBalance { available, locked });
        }

        // Re-inject open orders
        let mut restored_count = 0;
        for row in open_orders {
            let id: String = row.get("id");
            let user_id: String = row.get("user_id");
            let market: String = row.get("market_symbol");
            let side_str: String = row.get("side");
            
            let price = row.get::<String, _>("price").parse::<f64>().unwrap_or(0.0);
            let quantity = row.get::<String, _>("quantity").parse::<f64>().unwrap_or(0.0);
            let filled = row.get::<String, _>("filled_quantity").parse::<f64>().unwrap_or(0.0);

            let side = if side_str == "buy" { Side::Buy } else { Side::Sell };

            if let Some(book) = self.orderbooks.iter_mut().find(|ob| ob.ticker() == market) {
                book.restore_order(Order {
                    price,
                    quantity,
                    order_id: id,
                    filled,
                    side,
                    user_id,
                });
                restored_count += 1;
            }
        }

        tracing::info!("Hydration finalized. Active Users: {}, Resting Orders Injected: {}", self.balances.len(), restored_count);
        Ok(())
    }

    /// Handles order executions: lock funds -> matching engine process -> balance distribution -> database queue sink
    pub fn create_order(&mut self, data: CreateOrderData, redis: &crate::redis_manager::RedisManager) -> Result<(String, f64, Vec<OrderPlacedFill>), EngineError> {
        let parts: Vec<&str> = data.market.split('_').collect();
        let base_asset = parts.get(0).ok_or_else(|| EngineError::OrderbookNotFound(data.market.clone()))?;
        let quote_asset = parts.get(1).ok_or_else(|| EngineError::OrderbookNotFound(data.market.clone()))?;

        // 1. Lock necessary available assets
        self.check_and_lock_funds(base_asset, quote_asset, data.side, &data.user_id, data.price, data.quantity)?;

        let order_id = self.generate_order_id();
        
        let order = Order {
            price: data.price,
            quantity: data.quantity,
            order_id: order_id.clone(),
            filled: 0.0,
            side: data.side,
            user_id: data.user_id.clone(),
        };

        // 2. Fetch matcher and match limits
        let match_result = {
            let book = self.orderbooks.iter_mut()
                .find(|ob| ob.ticker() == data.market)
                .ok_or_else(|| EngineError::OrderbookNotFound(data.market.clone()))?;
            book.add_order(order)
        };

        // 3. Adjust client balances based on match fills
        self.update_balance(&data.user_id, base_asset, quote_asset, data.side, &match_result.fills);

        // 4. Redis Database Logging & WebSocket broadcasting writes
        for fill in &match_result.fills {
            let quote_quantity = fill.qty * fill.price;
            let timestamp = chrono::Utc::now().timestamp_millis() as u64;

            redis.push_to_db_processor(DbMessage::TradeAdded(TradeAddedData {
                id: fill.trade_id.to_string(),
                is_buyer_maker: data.side == Side::Sell,
                price: fill.price,
                quantity: fill.qty,
                quote_quantity,
                timestamp,
                market: data.market.clone(),
                maker_order_id: fill.maker_order_id.clone(),
                taker_order_id: order_id.clone(),
                maker_user_id: fill.other_user_id.clone(),
                taker_user_id: data.user_id.clone(),
                buyer_user_id: if data.side == Side::Buy { data.user_id.clone() } else { fill.other_user_id.clone() },
                seller_user_id: if data.side == Side::Sell { data.user_id.clone() } else { fill.other_user_id.clone() },
            }));

            redis.push_to_db_processor(DbMessage::OrderUpdate(OrderUpdateData {
                order_id: fill.maker_order_id.clone(),
                executed_qty: Some(fill.qty),
                market: None,
                price: None,
                quantity: None,
                side: None,
                user_id: None,
                status: None,
            }));
            
            // WS publish trade
            redis.publish_ws_message(&format!("trade@{}", data.market), WsPublishMessage {
                stream: format!("trade@{}", data.market),
                payload: WsPublishMessagePayload::Trade {
                    data: WsTradeData {
                        e: "trade",
                        t: fill.trade_id,
                        m: data.side == Side::Sell,
                        p: fill.price,
                        q: fill.qty,
                        s: data.market.clone(),
                    }
                }
            });
        }

        let status = if match_result.executed_qty <= 0.0 {
            OrderStatus::Open
        } else if match_result.executed_qty >= data.quantity {
            OrderStatus::Filled
        } else {
            OrderStatus::PartiallyFilled
        };

        redis.push_to_db_processor(DbMessage::OrderUpdate(OrderUpdateData {
            order_id: order_id.clone(),
            executed_qty: Some(match_result.executed_qty),
            market: Some(data.market.clone()),
            price: Some(data.price),
            quantity: Some(data.quantity),
            side: Some(data.side),
            user_id: Some(data.user_id.clone()),
            status: Some(status),
        }));

        // Broadcast current depth & ticker price
        if let Some(book) = self.orderbooks.iter().find(|ob| ob.ticker() == data.market) {
            let (bids, asks) = book.get_depth();
            let ticker_price = book.ticker_price;

            redis.publish_ws_message(&format!("depth@{}", data.market), WsPublishMessage {
                stream: format!("depth@{}", data.market),
                payload: WsPublishMessagePayload::Depth {
                    data: WsDepthData {
                        b: bids,
                        a: asks,
                        e: "depth",
                    }
                }
            });

            // Broadcast ticker price updates if trades matched
            if !match_result.fills.is_empty() {
                redis.publish_ws_message(&format!("ticker@{}", data.market), WsPublishMessage {
                    stream: format!("ticker@{}", data.market),
                    payload: WsPublishMessagePayload::Ticker {
                        data: WsTickerData {
                            c: ticker_price.to_string(),
                            s: data.market.clone(),
                            e: "ticker",
                        }
                    }
                });
            }
        }

        Ok((
            order_id,
            match_result.executed_qty,
            match_result.fills.iter().map(|f| OrderPlacedFill { price: f.price, qty: f.qty, trade_id: f.trade_id }).collect()
        ))
    }

    /// Deletes order from active asks/bids lists and unlocks remaining balances back to available status
    pub fn cancel_order(&mut self, data: CancelOrderData, client_id: &str, redis: &crate::redis_manager::RedisManager) {
        let parts: Vec<&str> = data.market.split('_').collect();
        let base_asset = parts.get(0).unwrap_or(&"BTC");
        let quote_asset = parts.get(1).unwrap_or(&"USDT");
        
        let cancelled_order = {
            if let Some(book) = self.orderbooks.iter_mut().find(|ob| ob.ticker() == data.market) {
                book.cancel_bid(&data.order_id)
                    .or_else(|| book.cancel_ask(&data.order_id))
            } else {
                None
            }
        };

        if let Some(order) = cancelled_order {
            if order.side == Side::Buy {
                let remaining = order.quantity - order.filled;
                let refund = remaining * order.price;

                if let Some(bal) = self.balances.get_mut(&order.user_id) {
                    if let Some(asset_bal) = bal.get_mut(*quote_asset) {
                        asset_bal.available += refund;
                        asset_bal.locked -= refund;
                    }
                }
            } else {
                let refund = order.quantity - order.filled;

                if let Some(bal) = self.balances.get_mut(&order.user_id) {
                    if let Some(asset_bal) = bal.get_mut(*base_asset) {
                        asset_bal.available += refund;
                        asset_bal.locked -= refund;
                    }
                }
            }

            redis.send_to_api(client_id, MessageFromEngine::OrderCancelled(OrderCancelledPayload {
                order_id: data.order_id.clone(),
                executed_qty: order.filled,
                remaining_qty: 0.0,
            }));

            redis.push_to_db_processor(DbMessage::OrderUpdate(OrderUpdateData {
                order_id: data.order_id,
                executed_qty: None,
                market: None,
                price: None,
                quantity: None,
                side: None,
                user_id: None,
                status: Some(OrderStatus::Cancelled),
            }));

            // Broadcast depth update for cancelled order
            if let Some(book) = self.orderbooks.iter().find(|ob| ob.ticker() == data.market) {
                let (bids, asks) = book.get_depth();
                redis.publish_ws_message(&format!("depth@{}", data.market), WsPublishMessage {
                    stream: format!("depth@{}", data.market),
                    payload: WsPublishMessagePayload::Depth {
                        data: WsDepthData {
                            b: bids,
                            a: asks,
                            e: "depth",
                        }
                    }
                });
            }
        }
    }

    /// Queries orderbook for open orders associated with a user ID
    pub fn get_open_orders(&self, data: crate::types::GetOpenOrdersData, client_id: &str, redis: &crate::redis_manager::RedisManager) {
        if let Some(book) = self.orderbooks.iter().find(|ob| ob.ticker() == data.market) {
            let list = book.get_open_orders(&data.user_id);
            redis.send_to_api(client_id, MessageFromEngine::OpenOrders(list));
        } else {
            redis.send_to_api(client_id, MessageFromEngine::OpenOrders(Vec::new()));
        }
    }

    /// Queries book level status
    pub fn get_depth(&self, data: crate::types::GetDepthData, client_id: &str, redis: &crate::redis_manager::RedisManager) {
        if let Some(book) = self.orderbooks.iter().find(|ob| ob.ticker() == data.market) {
            let (bids, asks) = book.get_depth();
            redis.send_to_api(client_id, MessageFromEngine::Depth(DepthPayload {
                market: Some(data.market),
                bids,
                asks,
            }));
        } else {
            redis.send_to_api(client_id, MessageFromEngine::Depth(DepthPayload {
                market: Some(data.market),
                bids: Vec::new(),
                asks: Vec::new(),
            }));
        }
    }

    /// Returns available balance values
    pub fn get_balance(&self, data: crate::types::GetBalanceData, client_id: &str, redis: &crate::redis_manager::RedisManager) {
        let balance_val = self.balances.get(&data.user_id)
            .and_then(|map| map.get(&data.asset))
            .map(|ab| ab.available)
            .unwrap_or(0.0);

        redis.send_to_api(client_id, MessageFromEngine::GetBalance(GetBalancePayload {
            balance: balance_val.to_string(),
        }));
    }

    /// Credits deposit amount to a user's wallet
    pub fn on_ramp(&mut self, user_id: &str, asset: &str, amount: f64) {
        self.create_user(user_id);
        if let Some(user_bal) = self.balances.get_mut(user_id) {
            if let Some(asset_bal) = user_bal.get_mut(asset) {
                asset_bal.available += amount;
            } else {
                user_bal.insert(asset.to_string(), UserAssetBalance { available: amount, locked: 0.0 });
            }
        }
    }

    /// Debits withdrawal amount from available balance
    pub fn withdraw(&mut self, user_id: &str, amount: f64) -> Result<(), EngineError> {
        let user_bal = self.balances.get_mut(user_id).ok_or_else(|| EngineError::UserNotFound(user_id.to_string()))?;
        let entry = user_bal.get_mut(BASE_CURRENCY).ok_or_else(|| EngineError::InsufficientFunds {
            user_id: user_id.to_string(),
            asset: BASE_CURRENCY.to_string(),
            required: amount,
            available: 0.0,
        })?;

        if entry.available < amount {
            return Err(EngineError::InsufficientFunds {
                user_id: user_id.to_string(),
                asset: BASE_CURRENCY.to_string(),
                required: amount,
                available: entry.available,
            });
        }

        entry.available -= amount;
        Ok(())
    }

    pub fn save_snapshot(&self) {
        if !self.with_snapshot {
            return;
        }
        let serialized_orderbooks: Vec<serde_json::Value> = self.orderbooks.iter()
            .map(|ob| ob.get_orderbook_details_for_snapshot())
            .collect();

        let payload = serde_json::json!({
            "orderbooks": serialized_orderbooks,
            "balances": self.balances,
        });

        if let Ok(mut file) = File::create(&self.snapshot_file) {
            if let Ok(content) = serde_json::to_string(&payload) {
                file.write_all(content.as_bytes()).ok();
            }
        }
    }

    pub fn close(&self) {
        self.save_snapshot();
    }

    // =========================================================================
    // 3. PRIVATE PROCEDURES (Locking, snapshots and balance bookkeeping)
    // =========================================================================

    fn load_snapshot(&mut self) {
        if !self.with_snapshot {
            return;
        }
        
        let path = std::path::Path::new(&self.snapshot_file);
        if !path.exists() {
            return;
        }

        if let Ok(file) = File::open(&self.snapshot_file) {
            let parsed: Result<serde_json::Value, _> = serde_json::from_reader(file);
            if let Ok(data) = parsed {
                if let Some(books_arr) = data.get("orderbooks").and_then(|v| v.as_array()) {
                    let mut restored_books = Vec::new();
                    for b_state in books_arr {
                        let base = b_state.get("baseAsset").and_then(|v| v.as_str()).unwrap_or("BTC");
                        let last_trade_id = b_state.get("lastTradeId").and_then(|v| v.as_u64()).unwrap_or(0);
                        let tick_price = b_state.get("currentPrice").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        
                        let mut bids_list = Vec::new();
                        if let Some(bids) = b_state.get("bids").and_then(|v| v.as_array()) {
                            for b in bids {
                                if let Ok(ord) = serde_json::from_value::<Order>(b.clone()) {
                                    bids_list.push(ord);
                                }
                            }
                        }
                        let mut asks_list = Vec::new();
                        if let Some(asks) = b_state.get("asks").and_then(|v| v.as_array()) {
                            for a in asks {
                                if let Ok(ord) = serde_json::from_value::<Order>(a.clone()) {
                                    asks_list.push(ord);
                                }
                            }
                        }

                        restored_books.push(Orderbook::new(base, bids_list, asks_list, last_trade_id, tick_price));
                    }
                    self.orderbooks = restored_books;
                }

                if let Some(bal_map) = data.get("balances").and_then(|v| v.as_object()) {
                    let mut restored_balances = HashMap::new();
                    for (u_id, inner_val) in bal_map {
                        if let Some(inner_obj) = inner_val.as_object() {
                            let mut asset_map = HashMap::new();
                            for (asset, b_struct) in inner_obj {
                                if let Ok(uab) = serde_json::from_value::<UserAssetBalance>(b_struct.clone()) {
                                    asset_map.insert(asset.clone(), uab);
                                }
                            }
                            restored_balances.insert(u_id.clone(), asset_map);
                        }
                    }
                    self.balances = restored_balances;
                }
                
                tracing::info!("Matching engine snapshot loaded successfully from: {}", self.snapshot_file);
            }
        }
    }

    fn check_and_lock_funds(&mut self, base_asset: &str, quote_asset: &str, side: Side, user_id: &str, price: f64, quantity: f64) -> Result<(), EngineError> {
        let user_wallet = self.balances.get_mut(user_id)
            .ok_or_else(|| EngineError::UserNotFound(user_id.to_string()))?;

        if side == Side::Buy {
            let cost = quantity * price;
            let wallet_entry = user_wallet.get_mut(quote_asset)
                .ok_or_else(|| EngineError::InsufficientFunds {
                    user_id: user_id.to_string(),
                    asset: quote_asset.to_string(),
                    required: cost,
                    available: 0.0,
                })?;

            if wallet_entry.available < cost {
                return Err(EngineError::InsufficientFunds {
                    user_id: user_id.to_string(),
                    asset: quote_asset.to_string(),
                    required: cost,
                    available: wallet_entry.available,
                });
            }

            wallet_entry.available -= cost;
            wallet_entry.locked += cost;
        } else {
            let wallet_entry = user_wallet.get_mut(base_asset)
                .ok_or_else(|| EngineError::InsufficientFunds {
                    user_id: user_id.to_string(),
                    asset: base_asset.to_string(),
                    required: quantity,
                    available: 0.0,
                })?;

            if wallet_entry.available < quantity {
                return Err(EngineError::InsufficientFunds {
                    user_id: user_id.to_string(),
                    asset: base_asset.to_string(),
                    required: quantity,
                    available: wallet_entry.available,
                });
            }

            wallet_entry.available -= quantity;
            wallet_entry.locked += quantity;
        }

        Ok(())
    }

    fn update_balance(&mut self, user_id: &str, base_asset: &str, quote_asset: &str, side: Side, fills: &[Fill]) {
        for fill in fills {
            let taker_user_id = user_id;
            let maker_user_id = &fill.other_user_id;

            // Retrieve balance handles
            // Fetch taker balance map
            let taker_balances = match self.balances.get_mut(taker_user_id) {
                Some(b) => b,
                None => continue,
            };
            
            let quote_amount = fill.qty * fill.price;
            let base_amount = fill.qty;

            if side == Side::Buy {
                // Taker is buyer, Maker is seller
                // 1. Update taker: Buy filled, deduct quote locked, credit base available
                if let Some(ab) = taker_balances.get_mut(quote_asset) {
                    ab.locked -= quote_amount;
                }
                if let Some(ab) = taker_balances.get_mut(base_asset) {
                    ab.available += base_amount;
                }

                // 2. Fetch maker balance map
                if let Some(maker_balances) = self.balances.get_mut(maker_user_id) {
                    // Update Maker (Seller): credit quote available, deduct base locked
                    if let Some(ab) = maker_balances.get_mut(quote_asset) {
                        ab.available += quote_amount;
                    }
                    if let Some(ab) = maker_balances.get_mut(base_asset) {
                        ab.locked -= base_amount;
                    }
                }
            } else {
                // Taker is seller, Maker is buyer
                // 1. Update taker: Sell filled, credit quote available, deduct base locked
                if let Some(ab) = taker_balances.get_mut(quote_asset) {
                    ab.available += quote_amount;
                }
                if let Some(ab) = taker_balances.get_mut(base_asset) {
                    ab.locked -= base_amount;
                }

                // 2. Fetch maker balance map
                if let Some(maker_balances) = self.balances.get_mut(maker_user_id) {
                    // Update Maker (Buyer): deduct quote locked, credit base available
                    if let Some(ab) = maker_balances.get_mut(quote_asset) {
                        ab.locked -= quote_amount;
                    }
                    if let Some(ab) = maker_balances.get_mut(base_asset) {
                        ab.available += base_amount;
                    }
                }
            }
        }
    }

    fn create_user(&mut self, user_id: &str) {
        if !self.balances.contains_key(user_id) {
            let mut assets_map = HashMap::new();
            for asset in &[BASE_CURRENCY, "BTC", "SOL"] {
                assets_map.insert(
                    asset.to_string(),
                    UserAssetBalance { available: 0.0, locked: 0.0 },
                );
            }
            self.balances.insert(user_id.to_string(), assets_map);
        }
    }

    fn generate_order_id(&self) -> String {
        rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(20)
            .map(char::from)
            .collect()
    }
}

// =========================================================================
// 4. UNIT TEST SUITE (Ledger updates, Lock funds validation)
// =========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_balances_on_ramp() {
        let mut engine = Engine::new();
        engine.create_user("user_1");
        
        // Assert initialized to 0
        let bal = engine.balances.get("user_1").unwrap().get("USDT").unwrap();
        assert_eq!(bal.available, 0.0);
        assert_eq!(bal.locked, 0.0);

        // On-ramp credits
        engine.on_ramp("user_1", "USDT", 1000.0);
        let bal = engine.balances.get("user_1").unwrap().get("USDT").unwrap();
        assert_eq!(bal.available, 1000.0);
        assert_eq!(bal.locked, 0.0);
    }

    #[test]
    fn test_engine_lock_funds_insufficient() {
        let mut engine = Engine::new();
        engine.create_user("user_1");
        engine.on_ramp("user_1", "USDT", 50.0);

        // Attempting to lock 100 USDT (10 quantity * 10 price) should crash due to InsufficientFunds
        let res = engine.check_and_lock_funds("BTC", "USDT", Side::Buy, "user_1", 10.0, 10.0);
        assert!(res.is_err());
        
        if let Err(EngineError::InsufficientFunds { user_id, asset, required, available }) = res {
            assert_eq!(user_id, "user_1");
            assert_eq!(asset, "USDT");
            assert_eq!(required, 100.0);
            assert_eq!(available, 50.0);
        } else {
            panic!("Expected InsufficientFunds error variant!");
        }
    }

    #[test]
    fn test_engine_lock_funds_success() {
        let mut engine = Engine::new();
        engine.create_user("user_1");
        engine.on_ramp("user_1", "USDT", 500.0);

        // Lock 100 USDT
        let res = engine.check_and_lock_funds("BTC", "USDT", Side::Buy, "user_1", 10.0, 10.0);
        assert!(res.is_ok());

        let bal = engine.balances.get("user_1").unwrap().get("USDT").unwrap();
        assert_eq!(bal.available, 400.0);
        assert_eq!(bal.locked, 100.0);
    }
}
