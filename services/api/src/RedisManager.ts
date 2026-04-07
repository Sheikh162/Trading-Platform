import { getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import {
  MessageFromEngine,
  MessageToEngine,
} from "@trading-platform/shared-types";
import { RedisClientType, createClient } from "redis";

const logger = createLogger("api");
//private instance for singleton class
export class RedisManager {
  private client: RedisClientType;
  private publisher: RedisClientType;
  private static instance: RedisManager;
  private subscriberReady = false;
  private publisherReady = false;

  private constructor() {
    const redisUrl = getRedisUrl();

    this.client = createClient({ url: redisUrl });
    this.publisher = createClient({ url: redisUrl });

    this.client.on("ready", () => {
      this.subscriberReady = true;
    });
    this.client.on("end", () => {
      this.subscriberReady = false;
    });
    this.publisher.on("ready", () => {
      this.publisherReady = true;
    });
    this.publisher.on("end", () => {
      this.publisherReady = false;
    });

    this.client.connect().catch((error) => {
      logger.error("Failed to connect API subscriber to Redis", error);
    });
    this.publisher.connect().catch((error) => {
      logger.error("Failed to connect API publisher to Redis", error);
    });
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public sendAndAwait(message: MessageToEngine) {
    return new Promise<MessageFromEngine>((resolve) => {
      const id = this.getRandomClientId();

      this.client.subscribe(id, (response) => {
        this.client.unsubscribe(id);
        resolve(JSON.parse(response));
      });

      this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
    });
  }

  public pushMessage(message: MessageToEngine) {
    this.publisher.lPush(
      "messages",
      JSON.stringify({ clientId: "api_processor", message }),
    );
  }

  public getRandomClientId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  public isReady() {
    return this.subscriberReady && this.publisherReady;
  }

  public async close() {
    await Promise.allSettled([this.client.quit(), this.publisher.quit()]);
  }
}
