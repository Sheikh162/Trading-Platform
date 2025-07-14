import { RedisClientType, createClient } from "redis";
import { MessageFromOrderbook } from "./types";
import { MessageToEngine } from "./types/to";

export class RedisManager {
    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;

    private constructor() {
        this.client = createClient();
        this.client.connect();
        this.publisher = createClient();
        this.publisher.connect();
    }

    public static getInstance() {
        if (!this.instance)  {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public sendAndAwait(message: MessageToEngine) { // result is sent to client
        return new Promise<MessageFromOrderbook>( (resolve) => {
            const id = this.getRandomClientId();
            // below function is an event listener
            this.client.subscribe(id, (message) => { // id is the redis channel name, callback executes when result published
                this.client.unsubscribe(id); 
                resolve(JSON.parse(message));
            });
            this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
/*             only after registering the subscription listener, you can publish to queue, otherwise race condition,
             always subscribe first, then publish */
        });
    }

    public getRandomClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

}