import fs from "fs";
import path from "path";
import { Client } from "pg";
import { getPostgresConfig } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import "dotenv/config";

const logger = createLogger("persistence-seed");
const client = new Client(getPostgresConfig());

async function ensureTimescaleArtifacts() {
  try {
    await client.query(
      "SELECT create_hypertable('trades', 'time', if_not_exists => TRUE);",
    );
    logger.info("Hypertable configured", { table: "trades" });
  } catch (e) {
    logger.warn("Hypertable setup skipped");
  }

  await client.query(`
    DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS klines_1w CASCADE;
  `);

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
}

async function applyMigrations() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = path.basename(file, ".sql");
    const existing = await client.query(
      `SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1`,
      [version],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      logger.info("Skipping applied migration", { file });
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    logger.info("Applying migration", { file });
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (version) VALUES ($1)`,
      [version],
    );
  }
}

async function initializeDB() {
  try {
    await client.connect();
    logger.info("Connected to PostgreSQL");
    await applyMigrations();
    await ensureTimescaleArtifacts();
    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Error initializing database", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeDB();
