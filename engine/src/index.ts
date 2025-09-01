import { createClient, } from "redis";
import { Engine } from "./trade/Engine";


async function main() {
    const engine = new Engine(); 
    const redisUrl = process.env.REDIS_URL 
    || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
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