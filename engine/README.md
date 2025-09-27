# Trading Engine Service

The Trading Engine is the core component of the trading platform, responsible for order matching, trade execution, and maintaining order books for different markets.

## Overview

This service processes trading orders, matches buy and sell orders, executes trades, and maintains real-time order books. It handles all the core trading logic including order validation, balance management, and market data publishing.

## Features

- **Order Matching**: Advanced order matching engine with price-time priority
- **Order Book Management**: Maintains separate order books for different markets
- **Balance Management**: Tracks user balances and handles fund locking/unlocking
- **Trade Execution**: Executes matched orders and updates balances
- **Real-time Updates**: Publishes market data via Redis pub/sub
- **Persistence**: Automatic state snapshots for recovery
- **Multi-market Support**: Handles multiple trading pairs

## Core Components

### 1. Engine (`Engine.ts`)
The main trading engine that orchestrates all trading operations:
- Processes incoming orders from the API
- Manages order books for different markets
- Handles user balance tracking
- Executes trade matching logic
- Publishes real-time market data

### 2. Orderbook (`Orderbook.ts`)
Manages individual market order books:
- Maintains bid and ask order lists
- Implements price-time priority matching
- Handles order placement and cancellation
- Calculates market depth data
- Tracks trade execution

### 3. Redis Manager (`RedisManager.ts`)
Handles communication with other services:
- Receives orders from API service
- Publishes trade and depth updates
- Manages message queues
- Handles pub/sub for real-time data

## Supported Operations

### Order Management
- **CREATE_ORDER**: Place new buy/sell orders
- **CANCEL_ORDER**: Cancel existing orders
- **GET_OPEN_ORDERS**: Retrieve user's open orders
- **GET_BALANCE**: Get user account balance

### Market Data
- **GET_DEPTH**: Retrieve order book depth
- **Trade Publishing**: Real-time trade execution updates
- **Depth Updates**: Order book changes
- **Ticker Updates**: Price change notifications

## Order Matching Algorithm

The engine uses a price-time priority matching system:

1. **Price Priority**: Orders with better prices execute first
2. **Time Priority**: Among orders with the same price, earlier orders execute first
3. **Partial Fills**: Orders can be partially filled across multiple counterparties
4. **Market Orders**: Execute immediately at best available price
5. **Limit Orders**: Execute only at specified price or better

## Balance Management

### User Balance Structure
```typescript
interface UserBalance {
  [asset: string]: {
    available: number;  // Available for trading
    locked: number;     // Locked in open orders
  }
}
```

### Balance Operations
- **Fund Locking**: Locks funds when orders are placed
- **Fund Unlocking**: Releases funds when orders are cancelled
- **Balance Updates**: Updates balances after trade execution
- **On-ramp Support**: Adds funds to user accounts

## Market Data Publishing

The engine publishes real-time data via Redis channels:

### Trade Updates (`trade@{market}`)
```json
{
  "stream": "trade@TATA_INR",
  "data": {
    "e": "trade",
    "t": 12345,
    "m": false,
    "p": "1000.50",
    "q": "10",
    "s": "TATA_INR"
  }
}
```

### Depth Updates (`depth@{market}`)
```json
{
  "stream": "depth@TATA_INR",
  "data": {
    "a": [["1001.00", "50"]],  // Asks
    "b": [["1000.00", "30"]],  // Bids
    "e": "depth"
  }
}
```

### Ticker Updates (`ticker@{market}`)
```json
{
  "stream": "ticker@TATA_INR",
  "data": {
    "c": "1000.50",
    "s": "TATA_INR",
    "e": "ticker"
  }
}
```

## State Persistence

### Snapshot System
- **Automatic Snapshots**: Saves state every 3 seconds
- **Recovery Support**: Restores from snapshots on startup
- **Order Book State**: Preserves all open orders
- **Balance State**: Maintains user balances
- **Trade History**: Tracks executed trades

### Snapshot Structure
```json
{
  "orderbooks": [
    {
      "baseAsset": "TATA",
      "bids": [...],
      "asks": [...],
      "lastTradeId": 12345,
      "currentPrice": 1000.50
    }
  ],
  "balances": [
    ["user1", {"INR": {"available": 10000, "locked": 500}}]
  ]
}
```

## Dependencies

- **Redis**: Message queue and pub/sub communication
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development
- **Vitest**: Testing framework

## Environment Variables

- `REDIS_URL`: Redis connection URL
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `WITH_SNAPSHOT`: Enable snapshot persistence (default: true)
- `SNAPSHOT_FILE`: Snapshot file path (default: ./snapshot.json)

## Development

### Prerequisites
- Node.js
- Redis server
- API service for order input

### Running the Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the engine
npm start

# Development mode (build + start)
npm run dev

# Run tests
npm test
```

### Project Structure

```
src/
├── index.ts              # Main engine entry point
├── RedisManager.ts       # Redis communication
├── trade/                # Core trading logic
│   ├── Engine.ts        # Main trading engine
│   ├── Orderbook.ts     # Order book management
│   └── events.ts        # Event definitions
├── types/                # TypeScript definitions
│   ├── index.ts         # Core types
│   ├── fromApi.ts       # API message types
│   ├── toApi.ts         # Response types
│   └── toWs.ts          # WebSocket message types
└── tests/                # Test files
    ├── engine.test.ts   # Engine tests
    └── orderbook.test.ts # Orderbook tests
```

## Testing

The engine includes comprehensive tests for:
- Order matching logic
- Balance management
- Order book operations
- Trade execution
- Error handling

Run tests with:
```bash
npm test
```

## Performance Characteristics

- **Low Latency**: Optimized for high-frequency trading
- **High Throughput**: Processes thousands of orders per second
- **Memory Efficient**: Efficient data structures for order books
- **Scalable**: Can handle multiple markets simultaneously

## Error Handling

- **Order Validation**: Validates orders before processing
- **Balance Checks**: Ensures sufficient funds before order placement
- **Market Validation**: Verifies market existence
- **Graceful Degradation**: Continues operation on non-critical errors

## Integration Points

### Input Sources
- **API Service**: Receives orders via Redis queue
- **Market Maker**: Processes automated trading orders

### Output Destinations
- **Database Service**: Publishes trade data for persistence
- **WebSocket Service**: Publishes real-time market data
- **API Service**: Sends order execution confirmations

## Monitoring and Logging

The engine provides detailed logging for:
- Order processing
- Trade execution
- Balance updates
- Error conditions
- Performance metrics