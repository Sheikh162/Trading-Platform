import { getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import { createClient, } from "redis";
import { Engine } from "./trade/Engine";

const logger = createLogger("engine");

async function main() {
    const engine = new Engine(); 
    await engine.hydrateFromDb();
    const redisClient = createClient({ url: getRedisUrl() });
    await redisClient.connect();
    logger.info("Engine connected to Redis and ready");
//messaging queue sends the ordes in fifo manner, synchronous
    while (true) {
        const response = await redisClient.rPop("messages" as string) // lpush done from sendandawait in api fn
        if (!response) {

        }  else {
            engine.process(JSON.parse(response));  // response structure {clientId,message}
        }        
    }

}

main();
