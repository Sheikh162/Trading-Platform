import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, GET_BALANCE } from "../types";
import { authMiddleware } from "../middleware";
import { pgPool } from "../db";
import {
    parseAsset,
    parseMarket,
    parseOptionalMarket,
    parseOrderSide,
    parsePositiveNumberString,
    parseRequiredString,
} from "../validation";

export const orderRouter = Router();

orderRouter.use(authMiddleware)

orderRouter.post("/", async (req, res) => {
    const parsedMarket = parseMarket(req.body.market);
    if (!parsedMarket.success) {
        return res.status(400).json({ message: parsedMarket.message });
    }

    const parsedPrice = parsePositiveNumberString(req.body.price, "price");
    if (!parsedPrice.success) {
        return res.status(400).json({ message: parsedPrice.message });
    }

    const parsedQuantity = parsePositiveNumberString(req.body.quantity, "quantity");
    if (!parsedQuantity.success) {
        return res.status(400).json({ message: parsedQuantity.message });
    }

    const parsedSide = parseOrderSide(req.body.side);
    if (!parsedSide.success) {
        return res.status(400).json({ message: parsedSide.message });
    }

    const userId: string = req.userId as string
    const response = await RedisManager.getInstance().sendAndAwait({
        type: CREATE_ORDER,
        data: {
            market: parsedMarket.data,
            price: parsedPrice.data,
            quantity: parsedQuantity.data,
            side: parsedSide.data,
            userId
        }
    });
    res.json(response.payload);
});

orderRouter.delete("/", async (req, res) => {
    const parsedOrderId = parseRequiredString(req.body.orderId, "orderId");
    if (!parsedOrderId.success) {
        return res.status(400).json({ message: parsedOrderId.message });
    }

    const parsedMarket = parseMarket(req.body.market);
    if (!parsedMarket.success) {
        return res.status(400).json({ message: parsedMarket.message });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: CANCEL_ORDER,
        data: {
            orderId: parsedOrderId.data,
            market: parsedMarket.data
        }
    });
    res.json(response.payload);
});

orderRouter.get("/open", async (req, res) => {
    const userId = req.userId as string;
    const parsedMarket = parseOptionalMarket(req.query.market);
    if (!parsedMarket.success) {
        return res.status(400).json({ message: parsedMarket.message });
    }

    const market = parsedMarket.data;
    const values = market ? [userId, market] : [userId];

    const result = await pgPool.query(
        `
            SELECT
                id,
                market_symbol,
                side,
                type,
                COALESCE(price, 0)::text AS price,
                quantity::text AS quantity,
                filled_quantity::text AS filled,
                UPPER(status::text) AS status,
                EXTRACT(EPOCH FROM created_at) * 1000 AS timestamp
            FROM orders
            WHERE user_id = $1
              AND status IN ('open', 'partially_filled')
              ${market ? "AND market_symbol = $2" : ""}
            ORDER BY created_at DESC
        `,
        values,
    );

    res.json(result.rows.map((row) => ({
        id: row.id,
        market: row.market_symbol,
        side: row.side,
        type: String(row.type).toUpperCase(),
        price: row.price,
        quantity: row.quantity,
        filled: row.filled,
        status: row.status,
        timestamp: Number(row.timestamp),
    })));
});

orderRouter.get("/history", async (req, res) => {
    const userId = req.userId as string;
    const parsedMarket = parseOptionalMarket(req.query.market);
    if (!parsedMarket.success) {
        return res.status(400).json({ message: parsedMarket.message });
    }

    const market = parsedMarket.data;
    const values = market ? [userId, market] : [userId];

    const result = await pgPool.query(
        `
            SELECT
                id,
                market_symbol,
                side,
                type,
                COALESCE(price, 0)::text AS price,
                quantity::text AS quantity,
                filled_quantity::text AS filled,
                UPPER(status::text) AS status,
                EXTRACT(EPOCH FROM created_at) * 1000 AS timestamp
            FROM orders
            WHERE user_id = $1
              ${market ? "AND market_symbol = $2" : ""}
            ORDER BY created_at DESC
            LIMIT 100
        `,
        values,
    );

    res.json(result.rows.map((row) => ({
        id: row.id,
        market: row.market_symbol,
        side: row.side,
        type: String(row.type).toUpperCase(),
        price: row.price,
        quantity: row.quantity,
        filled: row.filled,
        status: row.status,
        timestamp: Number(row.timestamp),
    })));
});

orderRouter.get("/balance", async (req, res) => {
    const userId = req.userId as string;
    const parsedAsset = parseAsset(req.query.asset);
    if (!parsedAsset.success) {
        return res.status(400).json({ message: parsedAsset.message });
    }

    const asset = parsedAsset.data;

    const result = await pgPool.query(
        `
            SELECT available::text AS balance
            FROM balances
            WHERE user_id = $1 AND asset = $2
        `,
        [userId, asset],
    );

    if (result.rows.length > 0) {
        return res.json({ balance: result.rows[0].balance });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_BALANCE,
        data: {
            userId,
        }
    });
    res.json(response.payload);
});
