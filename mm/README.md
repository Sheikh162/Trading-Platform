# Market Maker Service

The Market Maker service is an automated trading bot that provides liquidity to the trading platform by continuously placing and managing buy and sell orders around the current market price.

## Overview

This service acts as a market maker, automatically maintaining a spread of orders on both sides of the market to provide liquidity and improve trading conditions for other participants. It continuously adjusts its orders based on market conditions and existing order book state.

## Features

- **Automated Order Management**: Continuously places and cancels orders
- **Liquidity Provision**: Maintains buy and sell orders around market price
- **Dynamic Pricing**: Adjusts order prices based on market conditions
- **Order Book Monitoring**: Tracks existing orders and market depth
- **Risk Management**: Implements order limits and cancellation logic
- **Market Making Strategy**: Provides consistent bid-ask spread

## Market Making Strategy

### Core Algorithm
The market maker follows a simple but effective strategy:

1. **Price Discovery**: Generates a base price with small random variations
2. **Order Book Analysis**: Checks existing open orders for the configured users
3. **Order Cancellation**: Removes orders that are too far from current price or randomly
4. **Order Placement**: Places new orders to maintain target bid/ask count
5. **Continuous Operation**: Repeats the process every second

### Configuration Parameters
- **TOTAL_BIDS**: Target number of buy orders to maintain (default: 30)
- **TOTAL_ASK**: Target number of sell orders to maintain (default: 30)
- **MARKET**: Trading pair to provide liquidity for (default: "BTC_USDT")
- **BUY_USER_ID**: User ID for buy orders (default: "2")
- **SELL_USER_ID**: User ID for sell orders (default: "5")

## Order Management Logic

### Order Cancellation Strategy
The service implements intelligent order cancellation:

#### Buy Order Cancellation (`cancelBidsMoreThan`)
- Cancels buy orders priced above current market price
- Randomly cancels 50% of remaining buy orders for market dynamics
- Ensures orders don't get too far from current market conditions

#### Sell Order Cancellation (`cancelAsksLessThan`)
- Cancels sell orders priced below current market price
- Randomly cancels 50% of remaining sell orders for market dynamics
- Maintains competitive pricing

### Order Placement Strategy
After cancellation, the service places new orders to maintain target counts:

#### Buy Orders
- Places orders slightly below current market price
- Uses random price variations within 1 unit of base price
- Maintains consistent quantity (1 unit per order)

#### Sell Orders
- Places orders slightly above current market price
- Uses random price variations within 1 unit of base price
- Maintains consistent quantity (1 unit per order)

## API Integration

### Order Operations
The service interacts with the API service for:

- **GET /api/v1/order/open**: Retrieves current open orders
- **POST /api/v1/order**: Places new orders
- **DELETE /api/v1/order**: Cancels existing orders

### Request Examples

#### Get Open Orders
```bash
GET /api/v1/order/open?userId=2&market=BTC_USDT
```

#### Place Buy Order
```bash
POST /api/v1/order
{
  "market": "BTC_USDT",
  "price": "49999.5",
  "quantity": "1",
  "side": "buy",
  "userId": "2"
}
```

## Dependencies

- **Axios**: HTTP client for API communication
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development

## Environment Variables

- `API_BASE_URL`: Base URL for the API service
- `TOTAL_BIDS`: Number of buy orders to maintain (default: 30)
- `TOTAL_ASK`: Number of sell orders to maintain (default: 30)
- `MARKET`: Trading pair symbol (default: "BTC_USDT")
- `BUY_USER_ID`: User ID for buy orders (default: "2")
- `SELL_USER_ID`: User ID for sell orders (default: "5")

## Development

### Prerequisites
- Node.js 20+
- pnpm 10.32.1 (Enable with `corepack enable`)
- API service running and accessible
- Trading engine service operational
- User accounts with sufficient balances

### Running the Service

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Start the market maker
pnpm start

# Development mode (build + start)
pnpm run dev
```

### Project Structure

```
src/
└── index.ts              # Main market maker logic
```
