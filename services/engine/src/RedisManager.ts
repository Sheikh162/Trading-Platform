import { getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import {
  DbMessage,
  MessageFromEngine,
  WsPublishMessage,
} from "@trading-platform/shared-types";
import { RedisClientType, createClient } from "redis";

const logger = createLogger("engine");

export class RedisManager {
    private client: RedisClientType;
    private static instance: RedisManager;

    constructor() {
        this.client = createClient({ url: getRedisUrl() });
        this.client.connect().catch((error) => {
            logger.error("Failed to connect to Redis", error);
        });
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

    public publishMessage(channel: string, message: WsPublishMessage) {
        this.client.publish(channel, JSON.stringify(message));

    }

    public sendToApi(clientId: string, message: MessageFromEngine) {
        this.client.publish(clientId, JSON.stringify(message));
    }
}
