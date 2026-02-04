import { Client } from "pg";
import "dotenv/config";

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});

async function initializeDB() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database");

    // --- 1. CORE AUTH & WALLET TABLES ---
    console.log("Ensuring 'users' table exists...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

    console.log("Ensuring 'balances' table exists...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS balances (
                user_id TEXT REFERENCES users(id),
                asset TEXT NOT NULL,
                balance NUMERIC DEFAULT 0,
                locked NUMERIC DEFAULT 0,
                PRIMARY KEY (user_id, asset)
            );
        `);

    console.log("Ensuring 'on_ramps' table exists...");
    await client.query(`
            CREATE TABLE IF NOT EXISTS on_ramps (
                id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                amount NUMERIC NOT NULL,
                status TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

    // --- 2. MARKET DATA TABLES (TIMESCALEDB) ---
    console.log("Dropping old materialized views...");
    await client.query(`
            DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
            DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
            DROP MATERIALIZED VIEW IF EXISTS klines_1w CASCADE;
        `);

    console.log("Ensuring 'trades' table exists...");
    // Note: We use 'trades' now instead of 'tata_prices'
    await client.query(`
            CREATE TABLE IF NOT EXISTS trades (
                time            TIMESTAMP WITH TIME ZONE NOT NULL,
                price           DOUBLE PRECISION NOT NULL,
                volume          DOUBLE PRECISION NOT NULL,
                currency_code   VARCHAR(10) NOT NULL
            );
        `);

    // Convert to Hypertable (TimescaleDB magic)
    try {
      await client.query(
        "SELECT create_hypertable('trades', 'time', if_not_exists => TRUE);",
      );
      console.log("Hypertable 'trades' configured.");
    } catch (e) {
      console.log("Hypertable setup skipped (already exists or error).");
    }

    // --- 3. MATERIALIZED VIEWS (CANDLESTICKS) ---
    console.log("Creating 1-minute candles (klines_1m)...");
    await client.query(`
            CREATE MATERIALIZED VIEW klines_1m AS
            SELECT
                time_bucket('1 minute', time) AS bucket,
                first(price, time) AS open,
                max(price) AS high,
                min(price) AS low,
                last(price, time) AS close,
                sum(volume) AS volume,
                currency_code
            FROM trades
            GROUP BY bucket, currency_code;
        `);

    console.log("Creating 1-hour candles (klines_1h)...");
    await client.query(`
            CREATE MATERIALIZED VIEW klines_1h AS
            SELECT
                time_bucket('1 hour', time) AS bucket,
                first(price, time) AS open,
                max(price) AS high,
                min(price) AS low,
                last(price, time) AS close,
                sum(volume) AS volume,
                currency_code
            FROM trades
            GROUP BY bucket, currency_code;
        `);

    console.log("Creating 1-week candles (klines_1w)...");
    await client.query(`
            CREATE MATERIALIZED VIEW klines_1w AS
            SELECT
                time_bucket('1 week', time) AS bucket,
                first(price, time) AS open,
                max(price) AS high,
                min(price) AS low,
                last(price, time) AS close,
                sum(volume) AS volume,
                currency_code
            FROM trades
            GROUP BY bucket, currency_code;
        `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeDB();
