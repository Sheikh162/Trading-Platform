# WebSocket Service

The WebSocket service provides real-time communication capabilities for the trading platform, enabling live data streaming to connected clients including trade updates, order book changes, and market data.

## Overview

This service manages WebSocket connections and implements a pub/sub system using Redis to deliver real-time market data to connected clients. It acts as a bridge between the trading engine and frontend clients, providing low-latency data streaming.

## Features

- **Real-time Data Streaming**: Live trade, depth, and ticker updates
- **Connection Management**: Handles WebSocket connections and disconnections
- **Subscription Management**: Manages client subscriptions to different data streams
- **Redis Integration**: Uses Redis pub/sub for scalable message distribution
- **User Management**: Tracks connected users and their subscriptions
- **Automatic Cleanup**: Removes subscriptions when users disconnect

## Core Components

### 1. WebSocket Server (`index.ts`)
The main entry point that:
- Creates WebSocket server on configured port
- Handles new client connections
- Registers users with the UserManager

### 2. User Manager (`UserManager.ts`)
Manages connected WebSocket clients:
- **Singleton Pattern**: Single instance manages all users
- **User Registration**: Assigns unique IDs to new connections
- **Connection Tracking**: Maintains map of active connections
- **Cleanup Handling**: Removes users on disconnection

### 3. Subscription Manager (`SubscriptionManager.ts`)
Handles client subscriptions to data streams:
- **Subscription Tracking**: Maps users to their subscribed channels
- **Redis Integration**: Manages Redis pub/sub subscriptions
- **Efficient Broadcasting**: Distributes messages to subscribed users
- **Resource Management**: Unsubscribes from unused channels

### 4. User Class (`User.ts`)
Represents individual WebSocket connections:
- **Connection Management**: Wraps WebSocket connection
- **Message Broadcasting**: Sends data to connected clients
- **Event Handling**: Manages connection events

## Supported Data Streams

### Trade Streams (`trade@{market}`)
Real-time trade execution updates:
```json
{
  "stream": "trade@BTC_USDT",
  "data": {
    "e": "trade",
    "t": 12345,
    "m": false,
    "p": "50000.50",
    "q": "0.1",
    "s": "BTC_USDT"
  }
}
```

### Depth Streams (`depth@{market}`)
Order book depth updates:
```json
{
  "stream": "depth@BTC_USDT",
  "data": {
    "a": [["50001.00", "0.5"]],  // Asks
    "b": [["50000.00", "0.3"]],  // Bids
    "e": "depth"
  }
}
```

## Architecture

### Connection Flow
1. **Client Connection**: WebSocket client connects to server
2. **User Registration**: Server assigns unique user ID
3. **Subscription Management**: Client subscribes to desired streams
4. **Data Broadcasting**: Server forwards relevant data to client
5. **Connection Cleanup**: Automatic cleanup on disconnection

## Dependencies

- **WebSocket (ws)**: WebSocket server implementation
- **Redis**: Pub/sub messaging system
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development

## Environment Variables

- `PORT`: WebSocket server port
- `REDIS_URL`: Redis connection URL
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

## Development

### Prerequisites
- Node.js 20+
- pnpm 10.32.1 (Enable with `corepack enable`)
- Redis server
- Trading engine service (for data publishing)

### Running the Service

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Start the WebSocket server
pnpm start

# Development mode (build + start)
pnpm run dev
```

### Project Structure

```
src/
├── index.ts              # Main WebSocket server
├── UserManager.ts        # User connection management
├── User.ts              # Individual user representation
├── SubscriptionManager.ts # Subscription and pub/sub management
└── types/               # TypeScript definitions
```
