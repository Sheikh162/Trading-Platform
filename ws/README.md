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

### Depth Streams (`depth@{market}`)
Order book depth updates:
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

### Ticker Streams (`ticker@{market}`)
Price and market statistics:
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

## Architecture

### Connection Flow
1. **Client Connection**: WebSocket client connects to server
2. **User Registration**: Server assigns unique user ID
3. **Subscription Management**: Client subscribes to desired streams
4. **Data Broadcasting**: Server forwards relevant data to client
5. **Connection Cleanup**: Automatic cleanup on disconnection

### Redis Pub/Sub Integration
- **Channel Subscriptions**: Subscribes to Redis channels for market data
- **Message Broadcasting**: Forwards Redis messages to WebSocket clients
- **Efficient Distribution**: Only subscribes to channels with active clients
- **Resource Optimization**: Unsubscribes from unused channels

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
- Node.js
- Redis server
- Trading engine service (for data publishing)

### Running the Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the WebSocket server
npm start

# Development mode (build + start)
npm run dev
```

### Project Structure

```
src/
├── index.ts              # Main WebSocket server
├── UserManager.ts        # User connection management
├── User.ts              # Individual user representation
├── SubscriptionManager.ts # Subscription and pub/sub management
└── types/               # TypeScript definitions
    ├── in.ts            # Incoming message types
    └── out.ts           # Outgoing message types
```

## Client Integration

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Connection established
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle incoming data
};
```

### Subscription Management
Clients can subscribe to different data streams by sending subscription messages (implementation depends on client protocol).

## Performance Characteristics

### Scalability
- **Connection Handling**: Supports thousands of concurrent connections
- **Memory Efficient**: Minimal memory footprint per connection
- **Redis Optimization**: Efficient pub/sub with automatic cleanup
- **Message Broadcasting**: Optimized for high-frequency updates

### Latency
- **Low Latency**: Direct WebSocket communication
- **Redis Pub/Sub**: Fast message distribution
- **Efficient Routing**: Direct message delivery to subscribers

## Error Handling

### Connection Management
- **Graceful Disconnection**: Proper cleanup on client disconnect
- **Error Recovery**: Handles WebSocket errors gracefully
- **Resource Cleanup**: Automatic subscription cleanup

### Redis Integration
- **Connection Recovery**: Automatic Redis reconnection
- **Subscription Management**: Handles Redis subscription errors
- **Message Validation**: Validates incoming Redis messages

## Monitoring and Logging

The service provides logging for:
- New client connections
- User disconnections
- Subscription changes
- Redis connection status
- Error conditions

## Security Considerations

### Connection Security
- **Origin Validation**: Validate WebSocket origins
- **Rate Limiting**: Implement connection rate limiting
- **Authentication**: Add authentication for production use
- **Message Validation**: Validate incoming messages

### Resource Protection
- **Connection Limits**: Limit concurrent connections
- **Subscription Limits**: Limit subscriptions per user
- **Memory Management**: Monitor memory usage

## Integration Points

### Data Sources
- **Trading Engine**: Receives market data via Redis pub/sub
- **Database Service**: May receive historical data updates

### Data Consumers
- **Frontend Clients**: Web browsers and mobile apps
- **Trading Bots**: Automated trading systems
- **Analytics Services**: Market data analysis tools

## Deployment Considerations

### Production Setup
- **Load Balancing**: Use multiple instances behind load balancer
- **Redis Clustering**: Use Redis cluster for high availability
- **Monitoring**: Implement comprehensive monitoring
- **Scaling**: Horizontal scaling with multiple instances

### Docker Support
The service includes Docker configuration for containerized deployment.

## Testing

### Connection Testing
- **WebSocket Clients**: Test with various WebSocket clients
- **Subscription Testing**: Verify subscription management
- **Message Broadcasting**: Test real-time data delivery
- **Error Scenarios**: Test error handling and recovery

### Performance Testing
- **Load Testing**: Test with many concurrent connections
- **Message Throughput**: Measure message delivery performance
- **Memory Usage**: Monitor memory consumption
- **Latency Testing**: Measure message delivery latency

## Best Practices

### Development
- **Type Safety**: Use TypeScript for all message types
- **Error Handling**: Implement comprehensive error handling
- **Logging**: Add detailed logging for debugging
- **Testing**: Write tests for all components

### Production
- **Monitoring**: Implement health checks and monitoring
- **Scaling**: Plan for horizontal scaling
- **Security**: Implement proper security measures
- **Maintenance**: Regular updates and maintenance