
export interface KLine {
    close: string;
    end: string;
    high: string;
    low: string;
    open: string;
    quoteVolume: string;
    start: string;
    trades: string;
    volume: string;
}

export interface Trade {
    "id": number,
    "isBuyerMaker": boolean,
    "price": string,
    "quantity": string,
    "quoteQuantity": string,
    "timestamp": number
}

export interface Depth {
    bids: [string, string][],
    asks: [string, string][],
    lastUpdateId: string
}

export interface Ticker {
    "firstPrice": string,
    "high": string,
    "lastPrice": string,
    "low": string,
    "priceChange": string,
    "priceChangePercent": string,
    "quoteVolume": string,
    "symbol": string,
    "trades": string,
    "volume": string
}

// Add this to frontend/src/lib/types.ts

export interface Market {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  priceHistory: number[];
}


export interface Order {
    id: string;
    market: string;
    type: "LIMIT" | "MARKET";
    side: "buy" | "sell";
    price: string;
    quantity: string;
    filled: string;
    status: "OPEN" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "REJECTED";
    timestamp: number; // Unix timestamp
}

// ... existing types (Market, Order, Ticker, etc.)

export interface Asset {
    symbol: string;
    name: string;
    balance: string;
    value: string; // In fiat (e.g., INR)
    avgBuyPrice: string;
    unrealizedPnL: string; // "+20%" or "-5%"
    unrealizedPnLValue: string; // "+₹500"
    allocation: number; // Percentage 0-100
    icon: string;
}

export interface Transaction {
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL" | "TRADE_BUY" | "TRADE_SELL";
    amount: string;
    status: "COMPLETED" | "PENDING" | "FAILED";
    timestamp: number;
    details: string; // e.g. "UPI Ref: 123" or "Sold 10 TATA"
}

export interface DashboardStats {
    totalBalance: string;
    pnl24h: string;
    pnl24hPercent: string;
    openOrders: number;
    bestPerformer: {
        symbol: string;
        change: string;
    }
}