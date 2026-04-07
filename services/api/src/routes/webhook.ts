import express from "express";
import { USER_CREATED } from "@trading-platform/shared-types";
import { Webhook } from "svix";
import bodyParser from "body-parser";
import { RedisManager } from "../RedisManager";
import "dotenv/config";
import { pgPool } from "../db";
import { createLogger } from "@trading-platform/logger";

export const webhookRouter = express.Router();
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const logger = createLogger("api");

webhookRouter.post(
  "/clerk",
  // RAW body parser needed for Svix verification
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    if (!WEBHOOK_SECRET) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET");
    }

    const headers = req.headers;
    const payload = req.body;

    // 1. Verify Headers
    const svix_id = headers["svix-id"] as string;
    const svix_timestamp = headers["svix-timestamp"] as string;
    const svix_signature = headers["svix-signature"] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ message: "Error: Missing svix headers" });
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    // try {
    //   // 2. Verify Signature
    //   evt = wh.verify(payload.toString(), {
    //     "svix-id": svix_id,
    //     "svix-timestamp": svix_timestamp,
    //     "svix-signature": svix_signature,
    //   });
    // } catch (err) {
    //   return res.status(400).json({ message: "Verification failed" });
    // }

    // ... inside api/src/routes/webhook.ts

    try {
      // 2. Verify Signature
      evt = wh.verify(payload.toString(), {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      logger.warn("Webhook verification failed", {
        message: err.message,
        secretPrefix: `${WEBHOOK_SECRET?.slice(0, 5)}...`,
        payloadType: typeof payload,
      });
      return res.status(400).json({ message: "Verification failed" });
    }

    // 3. Handle 'user.created'
    if (evt.type === "user.created") {
      const userId = evt.data.id as string;
      //const email = evt.data.email_addresses[0]?.email_address;

      try {
        const email =
          evt.data.email_addresses?.[0]?.email_address ??
          evt.data.primary_email_address?.email_address ??
          null;

        await pgPool.query(
          `
            INSERT INTO users (id, email)
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE
            SET email = COALESCE(EXCLUDED.email, users.email)
          `,
          [userId, email],
        );

        await pgPool.query(
          `
            INSERT INTO balances (user_id, asset, available, locked)
            SELECT $1, symbol, 0, 0
            FROM assets
            ON CONFLICT (user_id, asset) DO NOTHING
          `,
          [userId],
        );

        // B. Notify Engine (Redis) - Fire and Forget!
        RedisManager.getInstance().pushMessage({
          type: USER_CREATED,
          data: {
            userId: userId,
          },
        });

        logger.info("Webhook user created and synced to engine", { userId });
      } catch (e) {
        logger.error("Error syncing webhook user", e);
        // Respond with 500 so Clerk retries
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

    return res.status(200).json({ message: "Webhook received" });
  },
);
