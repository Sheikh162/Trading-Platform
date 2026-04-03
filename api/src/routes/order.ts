import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, GET_BALANCE } from "../types";
import { authMiddleware } from "../middleware";
import { pgPool } from "../db";

export const orderRouter = Router();

orderRouter.use(authMiddleware)

orderRouter.post("/", async (req, res) => {
    const { market, price, quantity, side } = req.body; // we extracted userId from here before
    const userId: string = req.userId as string
    const response = await RedisManager.getInstance().sendAndAwait({
        type: CREATE_ORDER,
        data: {
            market,
            price,
            quantity,
            side,
            userId
        }
    });
    res.json(response.payload);
});

orderRouter.delete("/", async (req, res) => {
    const { orderId, market } = req.body;
    const response = await RedisManager.getInstance().sendAndAwait({
        type: CANCEL_ORDER,
        data: {
            orderId,
            market
        }
    });
    res.json(response.payload);
});

orderRouter.get("/open", async (req, res) => {
    const userId = req.userId as string;
    const market = req.query.market as string | undefined;
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
    const market = req.query.market as string | undefined;
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
    const asset = String(req.query.asset || "USDT").toUpperCase();

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
