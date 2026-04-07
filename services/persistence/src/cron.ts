import { Client } from 'pg'; 
import { getPostgresConfig } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";

const logger = createLogger("persistence-cron");
const client = new Client(getPostgresConfig());

async function connectToDatabase() {
    try {
        await client.connect();
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error("Failed to connect to PostgreSQL", error);
        process.exit(1);
    }
}

async function refreshViews() {
    try {
        const startTime = new Date();
        console.log(`\n[${startTime.toISOString()}] Starting materialized view refresh...`);
        
        console.log('Refreshing klines_1m view...');
        await client.query('REFRESH MATERIALIZED VIEW klines_1m');
        console.log('klines_1m refreshed');
        
        console.log('Refreshing klines_1h view...');
        await client.query('REFRESH MATERIALIZED VIEW klines_1h');
        console.log('klines_1h refreshed');
        
        console.log('Refreshing klines_1w view...');
        await client.query('REFRESH MATERIALIZED VIEW klines_1w');
        console.log('klines_1w refreshed');
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`All materialized views refreshed successfully in ${duration}ms`);
        
    } catch (error) {
        console.error('Error refreshing materialized views:', error);
    }
}

async function main() {
    console.log('Starting Cron job for materialized view refresh...');
    await connectToDatabase();
    
    // Initial refresh
    console.log('Performing initial materialized view refresh...');
    await refreshViews();
    
    // Set up interval (every 10 seconds)
    console.log('Setting up refresh interval (every 10 seconds)...');
    setInterval(() => {
        refreshViews();
    }, 1000 * 10);
    
    console.log('Cron job is now running and will refresh views every 10 seconds');
}

main().catch(console.error);
