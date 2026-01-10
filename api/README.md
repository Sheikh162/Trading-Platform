# API Service

The API service is the REST API gateway for the trading platform, providing HTTP endpoints for order management, market data, and trading operations.

## Overview

This service acts as the primary interface between clients and the trading engine, handling HTTP requests and communicating with the engine through Redis messaging queues.

## Features

- **Order Management**: Create, cancel, and query orders
- **Market Data**: Access to order book depth, trade history, and ticker information
- **Real-time Communication**: Uses Redis for asynchronous communication with the trading engine
- **CORS Support**: Configured for cross-origin requests

## API Endpoints

### Order Operations
- `POST /api/v1/order` - Create a new order
- `DELETE /api/v1/order` - Cancel an existing order
- `GET /api/v1/order/open` - Get open orders for a user and market
- `GET /api/v1/order/balance` - Get user balance

### Market Data
- `GET /api/v1/depth` - Get order book depth
- `GET /api/v1/klines` - Get candlestick/kline data
- `GET /api/v1/tickers` - Get ticker information
- `GET /api/v1/trades` - Get recent trades

## Request/Response Examples

### Create Order
```bash
POST /api/v1/order
Content-Type: application/json

{
  "market": "TATA_INR",
  "price": "1000.5",
  "quantity": "10",
  "side": "buy",
  "userId": "user123"
}
```

### Get Open Orders
```bash
GET /api/v1/order/open?userId=user123&market=TATA_INR
```

## Architecture

The API service uses a request-response pattern with Redis:

1. **Request Processing**: HTTP requests are received and validated
2. **Redis Communication**: Messages are sent to the engine via Redis queues
3. **Response Handling**: Engine responses are received and sent back to clients
4. **Error Handling**: Comprehensive error handling for various scenarios

## Dependencies

- **Express.js**: Web framework for HTTP server
- **CORS**: Cross-origin resource sharing middleware
- **Redis**: Message queue and pub/sub communication
- **TypeScript**: Type-safe development

## Environment Variables

- `PORT`: Server port (default: 3000)
- `REDIS_URL`: Redis connection URL
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

## Development

### Prerequisites
- Node.js
- Redis server
- Trading engine service

### Running the Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the service
npm start

# Development mode (build + start)
npm run dev
```

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── RedisManager.ts       # Redis communication manager
├── routes/               # API route handlers
│   ├── order.ts         # Order management endpoints
│   ├── depth.ts         # Order book depth endpoints
│   ├── kline.ts         # Candlestick data endpoints
│   ├── ticker.ts        # Ticker information endpoints
│   └── trades.ts        # Trade history endpoints
└── types/               # TypeScript type definitions
    ├── index.ts         # Main type definitions
    └── to.ts            # Message types for engine communication
```

## Communication Flow

1. Client sends HTTP request to API
2. API validates request and creates message
3. Message sent to Redis queue for engine processing
4. API subscribes to response channel
5. Engine processes message and publishes response
6. API receives response and sends HTTP reply to client

## Error Handling

The service includes comprehensive error handling for:
- Invalid request parameters
- Redis connection issues
- Engine communication timeouts
- Order validation failures

## Performance Considerations

- Uses Redis pub/sub for real-time communication
- Implements connection pooling for Redis
- Supports concurrent request handling
- Optimized for low-latency trading operations