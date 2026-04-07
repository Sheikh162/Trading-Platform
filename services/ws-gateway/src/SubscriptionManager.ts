import { getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";

const logger = createLogger("ws-gateway");

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private redisClient: RedisClientType;
    private connection: Promise<void>;

    private constructor() {
        this.redisClient = createClient({ url: getRedisUrl() });
        this.redisClient.on("error", (error) => {
            logger.error("WebSocket Redis error", error);
        });
        this.connection = this.redisClient
            .connect()
            .then(() => undefined)
            .catch((error) => {
                logger.error("Failed to connect WebSocket service to Redis", error);
            });
    }

    public static getInstance() {
        if (!this.instance)  {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribe(userId: string, subscription: string) {
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            return
        }

        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));
        this.reverseSubscriptions.set(subscription, (this.reverseSubscriptions.get(subscription) || []).concat(userId));
        if (this.reverseSubscriptions.get(subscription)?.length === 1) {
            void this.connection
                .then(() => this.redisClient.subscribe(subscription, this.redisCallbackHandler))
                .catch((error) => {
                    logger.error(`Failed to subscribe to Redis channel ${subscription}`, error);
                });
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        this.reverseSubscriptions.get(channel)?.forEach(s => UserManager.getInstance().getUser(s)?.emit(parsedMessage));
    }

    public unsubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));
        }
        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter(s => s !== userId));
            if (this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                void this.connection
                    .then(() => this.redisClient.unsubscribe(subscription))
                    .catch((error) => {
                        logger.error(`Failed to unsubscribe from Redis channel ${subscription}`, error);
                    });
            }
        }
    }

    public userLeft(userId: string) {
        this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId, s));
    }
    
    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
}

/* 
RedisManager.getInstance().publishMessage(`depth@${market}`, {
    stream: `depth@${market}`,
    data: {
        a: updatedAsks,
        b: updatedBid ? [updatedBid] : [],
        e: "depth"
    }
});
*/
