import { Router } from "express";
import { pgPool } from "../db";

export const marketsRouter = Router();

marketsRouter.get("/", async (_req, res) => {
  const result = await pgPool.query(
    `
      WITH latest_prices AS (
        SELECT DISTINCT ON (market_symbol)
          market_symbol,
          price,
          executed_at
        FROM trade_fills
        ORDER BY market_symbol, executed_at DESC
      ),
      previous_prices AS (
        SELECT DISTINCT ON (market_symbol)
          market_symbol,
          price
        FROM trade_fills
        WHERE executed_at <= NOW() - INTERVAL '24 hours'
        ORDER BY market_symbol, executed_at DESC
      ),
      volume_24h AS (
        SELECT
          market_symbol,
          COALESCE(SUM(quote_quantity), 0) AS volume_24h
        FROM trade_fills
        WHERE executed_at >= NOW() - INTERVAL '24 hours'
        GROUP BY market_symbol
      ),
      price_history AS (
        SELECT
          currency_code AS market_symbol,
          ARRAY_AGG(price ORDER BY time DESC) FILTER (WHERE price IS NOT NULL) AS prices
        FROM (
          SELECT
            currency_code,
            price,
            time,
            ROW_NUMBER() OVER (PARTITION BY currency_code ORDER BY time DESC) AS rn
          FROM trades
        ) ranked
        WHERE rn <= 10
        GROUP BY currency_code
      )
      SELECT
        m.symbol,
        m.base_asset,
        a.name,
        a.icon_url,
        a.circulating_supply,
        COALESCE(lp.price, 0) AS last_price,
        COALESCE(pp.price, lp.price, 0) AS previous_price,
        COALESCE(v.volume_24h, 0) AS volume_24h,
        ph.prices
      FROM markets m
      JOIN assets a ON a.symbol = m.base_asset
      LEFT JOIN latest_prices lp ON lp.market_symbol = m.symbol
      LEFT JOIN previous_prices pp ON pp.market_symbol = m.symbol
      LEFT JOIN volume_24h v ON v.market_symbol = m.symbol
      LEFT JOIN price_history ph ON ph.market_symbol = m.symbol
      WHERE m.status = 'active'
      ORDER BY m.symbol
    `,
  );

  res.json({
    markets: result.rows.map((row) => {
      const price = Number(row.last_price);
      const previousPrice = Number(row.previous_price);
      const change24h =
        previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;

      return {
        id: row.symbol,
        name: row.name,
        symbol: row.base_asset,
        image: row.icon_url,
        price,
        change24h: Number(change24h.toFixed(2)),
        volume24h: Number(row.volume_24h),
        marketCap: price * Number(row.circulating_supply || 0),
        priceHistory: (row.prices ?? []).map((value: string | number) => Number(value)).reverse(),
      };
    }),
  });
});
