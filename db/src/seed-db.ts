const { Client } = require('pg');

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
        console.log('Connected to PostgreSQL database');

        // Drop materialized views first (they depend on the table)
        console.log('Dropping existing materialized views...');
        await client.query(`
            DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
            DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
            DROP MATERIALIZED VIEW IF EXISTS klines_1w CASCADE;
        `);

        // Now we can safely drop the table
        console.log('Dropping existing tata_prices table...');
        await client.query('DROP TABLE IF EXISTS tata_prices CASCADE;');

        // Create the table with volume support
        console.log('Creating new tata_prices table...');
        await client.query(`
            CREATE TABLE "tata_prices"(
                time            TIMESTAMP WITH TIME ZONE NOT NULL,
                price           DOUBLE PRECISION,
                volume          DOUBLE PRECISION,
                currency_code   VARCHAR(10) DEFAULT 'INR'
            );
            
            SELECT create_hypertable('tata_prices', 'time', 'price', 2);
        `);

        // Recreate materialized views with volume aggregation
        console.log('Creating materialized views...');
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
            FROM tata_prices
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
            FROM tata_prices
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
            FROM tata_prices
            GROUP BY bucket, currency_code;
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// run the seeding only once, not everytime i do docker compose up
initializeDB();