import express from "express";
import { Webhook } from "svix";
import bodyParser from "body-parser";
import { RedisManager } from "../RedisManager";
import 'dotenv/config'
//import { Client } from "pg"; // Ensure you have your DB client set up

export const webhookRouter = express.Router();
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

// Postgres Client (Replace with your actual DB connection/Prisma client)
// const db = new Client({
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASSWORD,
//     port: Number(process.env.DB_PORT),
// });
// db.connect();

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
      // --- ADD THESE LOGS ---
      console.log("❌ Webhook Verification Failed:");
      console.log("Error Message:", err.message);
      console.log("Secret Used:", WEBHOOK_SECRET?.slice(0, 5) + "..."); 
      console.log("Payload Type:", typeof payload);
      // ----------------------
      return res.status(400).json({ message: "Verification failed" });
    }

    // 3. Handle 'user.created'
    if (evt.type === "user.created") {
      const userId = evt.data.id as string;
      //const email = evt.data.email_addresses[0]?.email_address;

      try {
        // A. Create in Database (Postgres)
        //await db.query("INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [userId, email]);
        
        // B. Notify Engine (Redis) - Fire and Forget!
        RedisManager.getInstance().pushMessage({
            type: "USER_CREATED",
            data: {
                userId: userId 
            }
        });
        
        console.log(`User ${userId} created and synced to Engine.`);
      } catch (e) {
        console.error("Error syncing user:", e);
        // Respond with 500 so Clerk retries
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

    return res.status(200).json({ message: "Webhook received" });
  }
);

