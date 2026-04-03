import { Router } from "express";
import { pgPool } from "../db";
import { parseMarket } from "../validation";

export const tradesRouter = Router();

tradesRouter.get("/", async (req, res) => {
  const parsedMarket = parseMarket(req.query.market || req.query.symbol);
  if (!parsedMarket.success) {
    return res.status(400).json({ message: parsedMarket.message });
  }

  const market = parsedMarket.data;

  try {
    const fillsResult = await pgPool.query(
      `
        SELECT
          trade_id,
          price::text AS price,
          quantity::text AS quantity,
          quote_quantity::text AS quote_quantity,
          executed_at,
          buyer_user_id = maker_user_id AS is_buyer_maker
        FROM trade_fills
        WHERE market_symbol = $1
        ORDER BY executed_at DESC
        LIMIT 50
      `,
      [market],
    );

    if (fillsResult.rows.length > 0) {
      return res.json(
        fillsResult.rows.map((row) => ({
          id: row.trade_id,
          price: row.price,
          quantity: row.quantity,
          quoteQuantity: row.quote_quantity,
          timestamp: new Date(row.executed_at).getTime(),
          isBuyerMaker: row.is_buyer_maker,
        })),
      );
    }

    const result = await pgPool.query(
      `
        SELECT time, price, volume, currency_code
        FROM trades
        WHERE currency_code = $1
        ORDER BY time DESC
        LIMIT 50
      `,
      [market],
    );

    res.json(
      result.rows.map((row) => ({
        id: `${row.currency_code}-${new Date(row.time).getTime()}`,
        price: row.price.toString(),
        quantity: row.volume.toString(),
        quoteQuantity: (Number(row.price) * Number(row.volume)).toString(),
        timestamp: new Date(row.time).getTime(),
        isBuyerMaker: false,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});
