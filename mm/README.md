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
- **TOTAL_BIDS**: Target number of buy orders to maintain (default: 5)
- **TOTAL_ASK**: Target number of sell orders to maintain (default: 5)
- **MARKET**: Trading pair to provide liquidity for (default: "TATA_INR")
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
GET /api/v1/order/open?userId=2&market=TATA_INR
```

#### Place Buy Order
```bash
POST /api/v1/order
{
  "market": "TATA_INR",
  "price": "999.5",
  "quantity": "1",
  "side": "buy",
  "userId": "2"
}
```

#### Cancel Order
```bash
DELETE /api/v1/order
{
  "orderId": "order_123",
  "market": "TATA_INR"
}
```

## Dependencies

- **Axios**: HTTP client for API communication
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development

## Environment Variables

- `API_BASE_URL`: Base URL for the API service
- `TOTAL_BIDS`: Number of buy orders to maintain (default: 5)
- `TOTAL_ASK`: Number of sell orders to maintain (default: 5)
- `MARKET`: Trading pair symbol (default: "TATA_INR")
- `BUY_USER_ID`: User ID for buy orders (default: "2")
- `SELL_USER_ID`: User ID for sell orders (default: "5")

## Development

### Prerequisites
- Node.js
- API service running and accessible
- Trading engine service operational
- User accounts with sufficient balances

### Running the Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the market maker
npm start

# Development mode (build + start)
npm run dev
```

### Project Structure

```
src/
└── index.ts              # Main market maker logic
```

## Operation Flow

### Main Loop
The service operates in a continuous loop:

1. **Generate Base Price**: Creates a reference price with small variations
2. **Fetch Open Orders**: Retrieves current orders for both users
3. **Count Existing Orders**: Calculates current bid/ask counts
4. **Cancel Outdated Orders**: Removes orders that don't meet criteria
5. **Calculate New Orders**: Determines how many orders to place
6. **Place New Orders**: Creates orders to reach target counts
7. **Wait and Repeat**: Pauses for 1 second before next iteration

### Error Handling
- **API Failures**: Continues operation on individual API call failures
- **Network Issues**: Implements retry logic for network problems
- **Order Validation**: Handles invalid order responses gracefully

## Performance Characteristics

### Execution Speed
- **1-Second Cycle**: Completes full cycle every second
- **Parallel Operations**: Uses Promise.all for concurrent order operations
- **Efficient Cancellation**: Batches order cancellations for performance

### Resource Usage
- **Low CPU**: Simple algorithm with minimal computational overhead
- **Minimal Memory**: Lightweight with no persistent state
- **Network Efficient**: Optimized API calls with minimal overhead

## Risk Management

### Order Limits
- **Fixed Quantities**: Uses consistent order sizes (1 unit)
- **Price Bounds**: Orders stay within reasonable price ranges
- **User Separation**: Uses different users for buy/sell orders

### Market Impact
- **Small Orders**: Minimal market impact with small order sizes
- **Continuous Adjustment**: Adapts to market conditions quickly
- **Liquidity Provision**: Improves market liquidity without manipulation

## Monitoring and Logging

The service provides logging for:
- Order placement and cancellation
- API response status
- Error conditions
- Market making statistics

## Integration with Trading Platform

### Dependencies
- **API Service**: For order management operations
- **Trading Engine**: For order processing and matching
- **User Accounts**: Requires configured user accounts with balances

### Data Flow
1. Market maker generates orders
2. Orders sent to API service
3. API service forwards to trading engine
4. Trading engine processes and matches orders
5. Market maker receives execution updates
6. Process repeats with updated market conditions

## Configuration and Customization

### Strategy Parameters
The market making strategy can be customized by modifying:
- Order quantities and frequencies
- Price spread parameters
- Cancellation logic
- Market selection

### User Management
- Configure different user IDs for buy/sell operations
- Ensure users have sufficient balances
- Monitor user account status

## Best Practices

### Deployment
- Run as a background service
- Monitor for continuous operation
- Implement health checks
- Use process managers for reliability

### Monitoring
- Track order placement success rates
- Monitor API response times
- Watch for error patterns
- Analyze market impact

### Maintenance
- Regular balance checks for user accounts
- Monitor market making effectiveness
- Adjust parameters based on market conditions
- Update strategy as needed
