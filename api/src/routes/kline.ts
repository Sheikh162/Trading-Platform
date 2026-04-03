import { Router } from "express";
import { pgPool } from "../db";
import { parseKlineInterval, parseKlineWindow, parseMarket } from "../validation";

export const klineRouter = Router();

function getBucketExpression(interval: string, column: string) {
  switch (interval) {
    case "1m":
      return `date_trunc('minute', ${column})`;
    case "1h":
      return `date_trunc('hour', ${column})`;
    case "1w":
      return `date_trunc('week', ${column})`;
    default:
      return null;
  }
}

klineRouter.get("/", async (req, res) => {
  const parsedMarket = parseMarket(req.query.symbol || req.query.market, "symbol");
  if (!parsedMarket.success) {
    return res.status(400).json({ message: parsedMarket.message });
  }

  const parsedInterval = parseKlineInterval(req.query.interval);
  if (!parsedInterval.success) {
    return res.status(400).json({ message: parsedInterval.message });
  }

  const parsedWindow = parseKlineWindow(req.query.startTime, req.query.endTime);
  if (!parsedWindow.success) {
    return res.status(400).json({ message: parsedWindow.message });
  }

  const symbol = parsedMarket.data;
  const interval = parsedInterval.data;
  const bucketExpression = getBucketExpression(interval, "executed_at");
  const start = new Date(parsedWindow.data.startTime * 1000);
  const end = new Date(parsedWindow.data.endTime * 1000);

  try {
    const fillsResult = await pgPool.query(
      `
        WITH fills AS (
          SELECT
            ${bucketExpression} AS bucket,
            executed_at,
            price::numeric AS price,
            quantity::numeric AS volume
          FROM trade_fills
          WHERE market_symbol = $1
            AND executed_at >= $2
            AND executed_at <= $3
        ),
        open_prices AS (
          SELECT DISTINCT ON (bucket)
            bucket,
            price AS open
          FROM fills
          ORDER BY bucket, executed_at ASC
        ),
        close_prices AS (
          SELECT DISTINCT ON (bucket)
            bucket,
            price AS close
          FROM fills
          ORDER BY bucket, executed_at DESC
        ),
        aggregates AS (
          SELECT
            bucket,
            MAX(price) AS high,
            MIN(price) AS low,
            SUM(volume) AS volume
          FROM fills
          GROUP BY bucket
        )
        SELECT
          a.bucket,
          o.open::text AS open,
          a.high::text AS high,
          a.low::text AS low,
          c.close::text AS close,
          a.volume::text AS volume
        FROM aggregates a
        JOIN open_prices o ON o.bucket = a.bucket
        JOIN close_prices c ON c.bucket = a.bucket
        ORDER BY a.bucket ASC
      `,
      [symbol, start, end],
    );

    if (fillsResult.rows.length > 0) {
      return res.json(
        fillsResult.rows.map((row) => ({
          close: row.close,
          end: row.bucket,
          high: row.high,
          low: row.low,
          open: row.open,
          start: row.bucket,
          volume: row.volume,
        })),
      );
    }

    const tradesBucketExpression = getBucketExpression(interval, "time");
    const tradesResult = await pgPool.query(
      `
        WITH trades_source AS (
          SELECT
            ${tradesBucketExpression} AS bucket,
            time,
            price::numeric AS price,
            volume::numeric AS volume
          FROM trades
          WHERE currency_code = $1
            AND time >= $2
            AND time <= $3
        ),
        open_prices AS (
          SELECT DISTINCT ON (bucket)
            bucket,
            price AS open
          FROM trades_source
          ORDER BY bucket, time ASC
        ),
        close_prices AS (
          SELECT DISTINCT ON (bucket)
            bucket,
            price AS close
          FROM trades_source
          ORDER BY bucket, time DESC
        ),
        aggregates AS (
          SELECT
            bucket,
            MAX(price) AS high,
            MIN(price) AS low,
            SUM(volume) AS volume
          FROM trades_source
          GROUP BY bucket
        )
        SELECT
          a.bucket,
          o.open::text AS open,
          a.high::text AS high,
          a.low::text AS low,
          c.close::text AS close,
          a.volume::text AS volume
        FROM aggregates a
        JOIN open_prices o ON o.bucket = a.bucket
        JOIN close_prices c ON c.bucket = a.bucket
        ORDER BY a.bucket ASC
      `,
      [symbol, start, end],
    );

    return res.json(
      tradesResult.rows.map((row) => ({
        close: row.close,
        end: row.bucket,
        high: row.high,
        low: row.low,
        open: row.open,
        start: row.bucket,
        volume: row.volume,
      })),
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json([]);
  }
});
