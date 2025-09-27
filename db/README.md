# Database Service

The Database service handles data persistence and analytics for the trading platform, managing trade data storage and providing materialized views for efficient querying.

## Overview

This service processes trade data from the trading engine and stores it in a TimescaleDB (PostgreSQL) database with time-series optimizations. It also maintains materialized views for fast access to candlestick/kline data.

## Features

- **Trade Data Processing**: Processes trade messages from Redis queue
- **Time-Series Storage**: Uses TimescaleDB for efficient time-series data storage
- **Materialized Views**: Pre-computed candlestick data for different timeframes
- **Automated Refresh**: Cron job for maintaining materialized views
- **Database Initialization**: Automated database schema setup

## Components

### 1. Main Processor (`index.ts`)
- Listens to Redis queue `db_processor` for trade messages
- Processes `TRADE_ADDED` messages from the trading engine
- Inserts trade data into `tata_prices` table
- Handles database connections and error recovery

### 2. Database Seeder (`seed-db.ts`)
- Initializes database schema
- Creates hypertables for time-series optimization
- Sets up materialized views for different timeframes
- Handles database migrations and cleanup

### 3. Cron Job (`cron.ts`)
- Refreshes materialized views every 10 seconds
- Maintains up-to-date candlestick data
- Monitors view refresh performance
- Provides logging for maintenance operations

## Database Schema

### Main Table: `tata_prices`
```sql
CREATE TABLE "tata_prices"(
    time            TIMESTAMP WITH TIME ZONE NOT NULL,
    price           DOUBLE PRECISION,
    volume          DOUBLE PRECISION,
    currency_code   VARCHAR(10) DEFAULT 'INR'
);
```

### Materialized Views

#### 1-Minute Candlesticks (`klines_1m`)
- Aggregates trade data into 1-minute intervals
- Provides OHLCV (Open, High, Low, Close, Volume) data

#### 1-Hour Candlesticks (`klines_1h`)
- Aggregates trade data into 1-hour intervals
- Optimized for medium-term analysis

#### 1-Week Candlesticks (`klines_1w`)
- Aggregates trade data into 1-week intervals
- Suitable for long-term trend analysis

## Message Processing

The service processes the following message types:

### TRADE_ADDED Message
```json
{
  "type": "TRADE_ADDED",
  "data": {
    "market": "TATA_INR",
    "id": "trade_123",
    "isBuyerMaker": false,
    "price": "1000.50",
    "quantity": "10",
    "quoteQuantity": "10005.00",
    "timestamp": 1640995200000
  }
}
```

## Dependencies

- **PostgreSQL/TimescaleDB**: Time-series database
- **Redis**: Message queue for trade data
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development

## Environment Variables

- `POSTGRES_USER`: Database username
- `POSTGRES_HOST`: Database host (TimescaleDB in Docker)
- `POSTGRES_DB`: Database name
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_PORT`: Database port
- `REDIS_URL`: Redis connection URL
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

## Development

### Prerequisites
- Node.js
- PostgreSQL with TimescaleDB extension
- Redis server
- Trading engine service

### Running the Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the main processor
npm start

# Development mode (build + start)
npm run dev

# Seed/initialize database
npm run db:seed

# Start cron job for view refresh
npm run refresh:views
```

### Project Structure

```
src/
├── index.ts              # Main trade processor
├── seed-db.ts            # Database initialization
├── cron.ts               # Materialized view refresh job
└── types.ts              # TypeScript type definitions
```

## Performance Optimizations

### TimescaleDB Features
- **Hypertables**: Automatic partitioning by time
- **Compression**: Efficient storage for historical data
- **Continuous Aggregates**: Real-time materialized views
- **Time-based Indexing**: Optimized queries for time-series data

### Materialized View Strategy
- **Pre-computed Aggregations**: Fast access to candlestick data
- **Regular Refresh**: Maintains data freshness
- **Multiple Timeframes**: Supports various trading strategies
- **Volume Aggregation**: Includes trading volume metrics

## Monitoring and Logging

The service provides comprehensive logging for:
- Database connection status
- Message processing counts
- Trade data insertion success/failure
- Materialized view refresh performance
- Error handling and recovery

## Data Flow

1. Trading engine publishes trade data to Redis queue
2. Database service consumes messages from `db_processor` queue
3. Trade data is validated and inserted into `tata_prices` table
4. Cron job refreshes materialized views every 10 seconds
5. API service queries materialized views for candlestick data

## Error Handling

- **Connection Recovery**: Automatic reconnection to database and Redis
- **Message Validation**: Validates trade data before insertion
- **Graceful Degradation**: Continues processing other messages on errors
- **Logging**: Comprehensive error logging for debugging

## Scaling Considerations

- **Horizontal Scaling**: Multiple instances can process different message batches
- **Database Partitioning**: TimescaleDB handles large datasets efficiently
- **View Optimization**: Materialized views reduce query load
- **Queue Management**: Redis handles high-throughput message processing