# Persistence Service

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
- Inserts trade data into `trades` table
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

### Main Table: `trades`
```sql
CREATE TABLE "trades"(
    time            TIMESTAMP WITH TIME ZONE NOT NULL,
    price           DOUBLE PRECISION NOT NULL,
    volume          DOUBLE PRECISION NOT NULL,
    currency_code   VARCHAR(10) NOT NULL
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
    "market": "BTC_USDT",
    "id": "trade_123",
    "isBuyerMaker": false,
    "price": "50000.50",
    "quantity": "0.1",
    "quoteQuantity": "5000.05",
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
- Node.js 20+
- pnpm 10.32.1 (Enable with `corepack enable`)
- PostgreSQL with TimescaleDB extension
- Redis server
- Trading engine service

### Running the Service

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Start the main processor
pnpm start

# Development mode (build + start)
pnpm run dev

# Seed/initialize database
pnpm run db:seed

# Start cron job for view refresh
pnpm run refresh:views
```

### Project Structure

```
src/
├── index.ts              # Main trade processor
├── seed-db.ts            # Database initialization
├── cron.ts               # Materialized view refresh job
└── types.ts              # TypeScript type definitions
```

## Monitoring and Logging

The service provides logging for:
- Database connection status
- Message processing counts
- Trade data insertion success/failure
- Materialized view refresh performance
- Error handling and recovery
