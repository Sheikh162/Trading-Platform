import { Client } from 'pg';
import { createClient } from 'redis';  
import { DbMessage } from './types';

const pgClient = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,  // ✅ timescaledb when in Docker
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
  });

async function connectToDatabase() {
    try {
        await pgClient.connect();
        console.log('✅ Successfully connected to PostgreSQL database');
    } catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:', error);
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 Starting DB processor...');
    await connectToDatabase();
    
    const redisUrl = process.env.REDIS_URL 
    || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

    const redisClient = createClient({ url: redisUrl });
    
    try {
        await redisClient.connect();
        console.log('✅ Successfully connected to Redis');
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        process.exit(1);
    }

    console.log('🔄 Starting to listen for messages from Redis queue "db_processor"...');
    let messageCount = 0;

    while (true) {
        try {
            const response = await redisClient.rPop("db_processor" as string);
            if (!response) {
                // Wait a bit before checking again to avoid busy waiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                messageCount++;
                console.log(`\n📨 Message #${messageCount} received from Redis queue`);
                
                const parsedResponse: DbMessage = JSON.parse(response);
                console.log('📋 Message type:', parsedResponse.type);
                
                if (parsedResponse.type === "TRADE_ADDED") {
                    const tradeData = parsedResponse.data;
                    console.log('💰 Processing trade:');
                    console.log('  - isBuyerMaker:', tradeData.isBuyerMaker);
                    console.log('  - Trade ID:', tradeData.id);
                    console.log('  - Market:', tradeData.market);
                    console.log('  - Price:', tradeData.price);
                    console.log('  - Quantity:', tradeData.quantity);
                    console.log('  - Timestamp:', new Date(tradeData.timestamp).toISOString());
                    
                    const price = parseFloat(tradeData.price);
                    const timestamp = new Date(tradeData.timestamp);
                    const volume = parseFloat(tradeData.quantity);
                    const query = 'INSERT INTO tata_prices (time, price,volume) VALUES ($1, $2, $3)';

                    // simultaneously, run the cron.ts server
                    
                    const values = [timestamp, price, volume];
                    await pgClient.query(query, values);
                    
                    console.log('✅ Trade data successfully inserted into database');
                } else {
                    console.log('ℹ️  Skipping message - not a TRADE_ADDED type');
                }
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            // Continue processing other messages
        }
    }
}

main().catch(console.error);