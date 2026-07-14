use crate::types::{Fill, Order, Side};

pub type DepthLevels = (Vec<(String, String)>, Vec<(String, String)>);

// =========================================================================
// 1. MATCH OUTCOMES & ORDERBOOK SCHEMAS
// =========================================================================

/// Holds the results of a matching transaction
#[derive(Debug, Clone)]
pub struct MatchResult {
    pub executed_qty: f64,
    pub fills: Vec<Fill>,
    pub affected_bids: Vec<(f64, f64)>, // Vector of (price, new_remaining_depth)
    pub affected_asks: Vec<(f64, f64)>,
}

/// Represents the in-memory double-sided queue for a single market (e.g. BTC_USDT)
#[derive(Debug, Clone)]
pub struct Orderbook {
    pub base_asset: String,
    pub quote_asset: String,
    pub bids: Vec<Order>, // Sorted descending (highest bid first)
    pub asks: Vec<Order>, // Sorted ascending (lowest ask first)
    pub last_trade_id: u64,
    pub ticker_price: f64,
}

// =========================================================================
// 2. ORDERBOOK METHOD IMPLEMENTATIONS (Top-Down Layout)
// =========================================================================

impl Orderbook {
    /// Creates a new match list or restores orderbook from db state
    pub fn new(base_asset: &str, bids: Vec<Order>, asks: Vec<Order>, last_trade_id: u64, ticker_price: f64) -> Self {
        Self {
            base_asset: base_asset.to_string(),
            quote_asset: "USDT".to_string(),
            bids,
            asks,
            last_trade_id,
            ticker_price,
        }
    }

    /// Formats the trading pair (e.g. "BTC_USDT")
    pub fn ticker(&self) -> String {
        format!("{}_{}", self.base_asset, self.quote_asset)
    }

    /// Restores an existing order back into sorted array maps on startup hydration
    pub fn restore_order(&mut self, order: Order) {
        if order.side == Side::Buy {
            self.insert_bid(order);
        } else {
            self.insert_ask(order);
        }
    }

    /// Ingestion interface for limit orders. Runs matching, and saves leftovers into queues.
    pub fn add_order(&mut self, mut order: Order) -> MatchResult {
        if order.side == Side::Buy {
            let result = self.match_bid(&mut order);
            order.filled = result.executed_qty;
            if result.executed_qty < order.quantity {
                self.insert_bid(order);
            }
            result
        } else {
            let result = self.match_ask(&mut order);
            order.filled = result.executed_qty;
            if result.executed_qty < order.quantity {
                self.insert_ask(order);
            }
            result
        }
    }

    /// Cancels a bid order using its ID, returning the order details if found and deleted
    pub fn cancel_bid(&mut self, order_id: &str) -> Option<Order> {
        if let Some(pos) = self.bids.iter().position(|x| x.order_id == order_id) {
            Some(self.bids.remove(pos))
        } else {
            None
        }
    }

    /// Cancels an ask order using its ID, returning the order details if found and deleted
    pub fn cancel_ask(&mut self, order_id: &str) -> Option<Order> {
        if let Some(pos) = self.asks.iter().position(|x| x.order_id == order_id) {
            Some(self.asks.remove(pos))
        } else {
            None
        }
    }

    /// Outputs the book depth charts with prices and volumes summarized by levels
    pub fn get_depth(&self) -> DepthLevels {
        let mut bids_depth = Vec::new();
        for order in &self.bids {
            let remaining = order.quantity - order.filled;
            if remaining <= 0.0 {
                continue;
            }
            if let Some(last) = bids_depth.last_mut() {
                let (price_str, quantity_str): &mut (String, String) = last;
                if let Ok(price_f) = price_str.parse::<f64>() {
                    if (price_f - order.price).abs() < f64::EPSILON {
                        if let Ok(qty_f) = quantity_str.parse::<f64>() {
                            *quantity_str = (qty_f + remaining).to_string();
                            continue;
                        }
                    }
                }
            }
            bids_depth.push((order.price.to_string(), remaining.to_string()));
        }

        let mut asks_depth = Vec::new();
        for order in &self.asks {
            let remaining = order.quantity - order.filled;
            if remaining <= 0.0 {
                continue;
            }
            if let Some(last) = asks_depth.last_mut() {
                let (price_str, quantity_str): &mut (String, String) = last;
                if let Ok(price_f) = price_str.parse::<f64>() {
                    if (price_f - order.price).abs() < f64::EPSILON {
                        if let Ok(qty_f) = quantity_str.parse::<f64>() {
                            *quantity_str = (qty_f + remaining).to_string();
                            continue;
                        }
                    }
                }
            }
            asks_depth.push((order.price.to_string(), remaining.to_string()));
        }

        (bids_depth, asks_depth)
    }

    /// Filters open resting book orders associated with a user ID
    pub fn get_open_orders(&self, user_id: &str) -> Vec<Order> {
        let mut list = Vec::new();
        for ask in &self.asks {
            if ask.user_id == user_id {
                list.push(ask.clone());
            }
        }
        for bid in &self.bids {
            if bid.user_id == user_id {
                list.push(bid.clone());
            }
        }
        list
    }

    /// Maps orderbook fields structure to database seed JSON values
    pub fn get_orderbook_details_for_snapshot(&self) -> serde_json::Value {
        serde_json::json!({
            "baseAsset": self.base_asset,
            "bids": self.bids,
            "asks": self.asks,
            "lastTradeId": self.last_trade_id,
            "currentPrice": self.ticker_price
        })
    }

    // =========================================================================
    // 3. INTERNAL HELPER SEQUENCES (Bids/Asks sorting and matching queries)
    // =========================================================================

    fn match_bid(&mut self, order: &mut Order) -> MatchResult {
        let mut fills = Vec::with_capacity(8);
        let mut executed_qty = 0.0;
        let mut affected_prices: Vec<f64> = Vec::new();

        for ask in &mut self.asks {
            if ask.user_id != order.user_id && ask.price <= order.price {
                let fillable = f64::min(
                    order.quantity - executed_qty,
                    ask.quantity - ask.filled,
                );
                if fillable <= 0.0 {
                    continue;
                }

                executed_qty += fillable;
                ask.filled += fillable;

                if !affected_prices.contains(&ask.price) {
                    affected_prices.push(ask.price);
                }

                self.last_trade_id += 1;
                fills.push(Fill {
                    price: ask.price,
                    qty: fillable,
                    trade_id: self.last_trade_id,
                    other_user_id: ask.user_id.clone(),
                    maker_order_id: ask.order_id.clone(),
                });

                self.ticker_price = ask.price;

                if executed_qty >= order.quantity {
                    break;
                }
            }
        }

        let mut affected_asks = Vec::new();
        for price in affected_prices {
            let remaining_depth: f64 = self
                .asks
                .iter()
                .filter(|a| (a.price - price).abs() < f64::EPSILON && a.filled < a.quantity)
                .map(|a| a.quantity - a.filled)
                .sum();
            affected_asks.push((price, remaining_depth));
        }

        self.asks.retain(|x| x.filled < x.quantity);

        let mut affected_bids = Vec::new();
        if order.quantity > executed_qty {
            affected_bids.push((order.price, order.quantity - executed_qty));
        }

        MatchResult {
            executed_qty,
            fills,
            affected_bids,
            affected_asks,
        }
    }

    fn match_ask(&mut self, order: &mut Order) -> MatchResult {
        let mut fills = Vec::with_capacity(8);
        let mut executed_qty = 0.0;
        let mut affected_prices: Vec<f64> = Vec::new();

        for bid in &mut self.bids {
            if bid.user_id != order.user_id && bid.price >= order.price {
                let fillable = f64::min(
                    order.quantity - executed_qty,
                    bid.quantity - bid.filled,
                );
                if fillable <= 0.0 {
                    continue;
                }

                executed_qty += fillable;
                bid.filled += fillable;

                if !affected_prices.contains(&bid.price) {
                    affected_prices.push(bid.price);
                }

                self.last_trade_id += 1;
                fills.push(Fill {
                    price: bid.price,
                    qty: fillable,
                    trade_id: self.last_trade_id,
                    other_user_id: bid.user_id.clone(),
                    maker_order_id: bid.order_id.clone(),
                });

                self.ticker_price = bid.price;

                if executed_qty >= order.quantity {
                    break;
                }
            }
        }

        let mut affected_bids = Vec::new();
        for price in affected_prices {
            let remaining_depth: f64 = self
                .bids
                .iter()
                .filter(|b| (b.price - price).abs() < f64::EPSILON && b.filled < b.quantity)
                .map(|b| b.quantity - b.filled)
                .sum();
            affected_bids.push((price, remaining_depth));
        }

        self.bids.retain(|x| x.filled < x.quantity);

        let mut affected_asks = Vec::new();
        if order.quantity > executed_qty {
            affected_asks.push((order.price, order.quantity - executed_qty));
        }

        MatchResult {
            executed_qty,
            fills,
            affected_bids,
            affected_asks,
        }
    }

    fn insert_bid(&mut self, order: Order) {
        if self.bids.is_empty() || order.price <= self.bids.last().unwrap().price {
            self.bids.push(order);
            return;
        }

        for i in 0..self.bids.len() {
            if order.price > self.bids[i].price {
                self.bids.insert(i, order);
                return;
            }
        }
    }

    fn insert_ask(&mut self, order: Order) {
        if self.asks.is_empty() || order.price >= self.asks.last().unwrap().price {
            self.asks.push(order);
            return;
        }

        for i in 0..self.asks.len() {
            if order.price < self.asks[i].price {
                self.asks.insert(i, order);
                return;
            }
        }
    }
}

// =========================================================================
// 4. UNIT TEST SUITE (Beginner-Friendly Matching Verification)
// =========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_orderbook_sorting() {
        let mut book = Orderbook::new("BTC", vec![], vec![], 0, 0.0);
        
        let o1 = Order {
            price: 100.0,
            quantity: 1.0,
            order_id: "1".to_string(),
            filled: 0.0,
            side: Side::Buy,
            user_id: "user_a".to_string(),
        };
        let o2 = Order {
            price: 105.0,
            quantity: 1.0,
            order_id: "2".to_string(),
            filled: 0.0,
            side: Side::Buy,
            user_id: "user_a".to_string(),
        };
        let o3 = Order {
            price: 98.0,
            quantity: 1.0,
            order_id: "3".to_string(),
            filled: 0.0,
            side: Side::Buy,
            user_id: "user_a".to_string(),
        };

        book.restore_order(o1);
        book.restore_order(o2);
        book.restore_order(o3);

        // Bids sorted descending: highest price first (105.0 -> 100.0 -> 98.0)
        assert_eq!(book.bids[0].price, 105.0);
        assert_eq!(book.bids[1].price, 100.0);
        assert_eq!(book.bids[2].price, 98.0);
    }

    #[test]
    fn test_order_matching_execution() {
        let mut book = Orderbook::new("BTC", vec![], vec![], 0, 0.0);
        
        // Sell order: 1 BTC at 1000.0
        let sell_order = Order {
            price: 1000.0,
            quantity: 1.0,
            order_id: "sell_id".to_string(),
            filled: 0.0,
            side: Side::Sell,
            user_id: "seller".to_string(),
        };
        book.add_order(sell_order);

        // Buy order: 1 BTC at 1001.0
        let buy_order = Order {
            price: 1001.0,
            quantity: 1.0,
            order_id: "buy_id".to_string(),
            filled: 0.0,
            side: Side::Buy,
            user_id: "buyer".to_string(),
        };
        
        let result = book.add_order(buy_order);

        // Match triggers at maker's resting price (1000.0)
        assert_eq!(result.executed_qty, 1.0);
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].price, 1000.0);
        assert_eq!(result.fills[0].other_user_id, "seller");
        assert_eq!(book.asks.len(), 0);
        assert_eq!(book.bids.len(), 0);
    }
}
