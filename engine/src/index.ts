import { createClient, } from "redis";
import { Engine } from "./trade/Engine";


async function main() {
    const engine = new Engine(); 
    const redisClient = createClient();
    await redisClient.connect();

    while (true) {
        const response = await redisClient.rPop("messages" as string) // lpush done from sendandawait in api fn
        if (!response) {

        }  else {
            engine.process(JSON.parse(response));
        }        
    }

}

main();