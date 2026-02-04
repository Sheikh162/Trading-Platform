import { Client } from "pg";
import { Router } from "express";

const pgClient = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});

pgClient.connect();

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
  const { symbol, interval, startTime, endTime } = req.query;

  let query;
  switch (interval) {
    case "1m":
      query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2 AND currency_code = $3`;
      break;
    case "1h":
      query = `SELECT * FROM klines_1h WHERE bucket >= $1 AND bucket <= $2 AND currency_code = $3`;
      break;
    case "1w":
      query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2 AND currency_code = $3`;
      break;
    default:
      return res.status(400).send("Invalid interval");
  }

  try {
    //@ts-ignore
    const result = await pgClient.query(query, [
      new Date(Number(startTime) * 1000),
      new Date(Number(endTime) * 1000),
      symbol,
    ]);

    res.json(
      result.rows.map((x) => ({
        close: x.close,
        end: x.bucket, // TradingView uses the start time as the key usually
        high: x.high,
        low: x.low,
        open: x.open,
        // quoteVolume: x.quoteVolume, // REMOVED: View doesn't have this
        start: x.bucket,
        // trades: x.trades, // REMOVED: View doesn't have this
        volume: x.volume,
      })),
    );
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});
