import { NextFunction, Request, Response } from "express";
import { strict as assert } from "assert";
import { ensureUserExists, pgPool } from "./db";

// Extend the Express Request type to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            role?: "user" | "admin" | "bot";
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check for Bot/Admin Secret first (For Market Maker)
    const adminSecret = req.headers["x-admin-secret"];
    
    if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
        // Trusted Bot Mode: Allow the bot to specify the userId in the body
        // This is necessary because your MM script simulates two different users (2 and 5)
        const requestedUserId =
            req.body?.userId ||
            (typeof req.query.userId === "string" ? req.query.userId : undefined);

        if (requestedUserId) {
            req.userId = requestedUserId;
        } else {
            // Default Bot ID if none provided
            req.userId = "bot_market_maker";
        }
        req.role = "bot";
        await ensureUserExists(pgPool, req.userId as string);
        next();
        return;
    }

    // 2. Check for Clerk Token (For Real Users)
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        // Verify the token using Clerk's `requireAuth` or manual verification
        // Note: For simplicity here, we assume the loadClerkMiddleware was used in index.ts
        // or we use the loose validation for now.
        
        // In production, you use the @clerk/express `requireAuth` 
        // For now, let's assume the Clerk Middleware in index.ts attached the auth object
        const auth = (req as any).auth;
        
        if (!auth || !auth.userId) {
             res.status(401).json({ message: "Unauthorized" });
             return;
        }

        req.userId = auth.userId;
        req.role = "user";
        await ensureUserExists(pgPool, req.userId as string);
        next();
    } catch (e) {
        res.status(401).json({ message: "Invalid Token" });
        return;
    }
}
