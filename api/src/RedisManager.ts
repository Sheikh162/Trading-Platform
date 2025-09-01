import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook } from "./types";
import { MessageToEngine } from "./types/to";

export class RedisManager {
    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;
    private constructor() {
        const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

        this.client = createClient({ url: redisUrl });
        this.publisher = createClient({ url: redisUrl });

        // connect returns a Promise → don’t forget to await in init
        this.client.connect().catch(console.error);
        this.publisher.connect().catch(console.error);
    }   
    public static getInstance() {
        if (!this.instance)  {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public sendAndAwait(message: MessageToEngine) { // result is sent to client
        return new Promise<MessageFromOrderbook>( (resolve) => {
            /* 
            why pubsub here?
            client i.e api server subscribes to the client id i.e channel which is unique for each order sent by the api to engine.
            the engine is subscribed to the same unique client i.e channel, and then publishes the response
            
            but why only pubsub, why not anything else here? need to find solution.
            */
            
            const id = this.getRandomClientId();
            // below function is an event listener
            this.client.subscribe(id, (message) => { // id is the redis channel name, callback executes when result published
                this.client.unsubscribe(id); 
                resolve(JSON.parse(message));
            });
            // the above is pubsub, dont understand why it exists , the below is messaging queue for pushing orders, 
            this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
/*             only after registering the subscription listener, you can publish to queue, otherwise race condition,
             always subscribe first, then publish */
        });
    }

    public getRandomClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

}