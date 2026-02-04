import { Router } from "express";
import { Client } from "pg";

const pgClient = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});
pgClient.connect();

export const tradesRouter = Router();

tradesRouter.get("/", async (req, res) => {
  const { market } = req.query;

  // Fetch last 50 trades for this market
  const query = `
        SELECT time, price, volume, currency_code
        FROM trades
        WHERE currency_code = $1
        ORDER BY time DESC
        LIMIT 50
    `;

  try {
    const result = await pgClient.query(query, [market]);
    res.json(
      result.rows.map((row) => ({
        id: row.id, // Optional if you added ID to table
        price: row.price.toString(),
        quantity: row.volume.toString(),
        timestamp: row.time,
        // We don't store buyer/maker in DB yet, so we mock it or infer it
        isBuyerMaker: false,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});
