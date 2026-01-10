import { RedisClientType, createClient } from "redis";
import { ORDER_UPDATE, TRADE_ADDED } from "./types";
import { WsMessage } from "./types/toWs";
import { MessageToApi } from "./types/toApi";

type DbMessage = {
    type: typeof TRADE_ADDED,
    data: {
        id: string,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string
    }
} | {
    type: typeof ORDER_UPDATE,
    data: {
        orderId: string,
        executedQty: number,
        market?: string,
        price?: string,
        quantity?: string,
        side?: "buy" | "sell",
    }
}

export class RedisManager {
    private client: RedisClientType;
    private static instance: RedisManager;

    constructor() {
        const redisUrl = process.env.REDIS_URL 
        || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

        this.client = createClient({ url: redisUrl });
        this.client.connect();
    }

    public static getInstance() {
        if (!this.instance)  {
            this.instance = new RedisManager();
        }
        return this.instance;
    }
  
    public pushMessage(message: DbMessage) {
        this.client.lPush("db_processor", JSON.stringify(message));
    }

    public publishMessage(channel: string, message: WsMessage) {
        this.client.publish(channel, JSON.stringify(message));

    }

    public sendToApi(clientId: string, message: MessageToApi) {
        this.client.publish(clientId, JSON.stringify(message));
    }
}