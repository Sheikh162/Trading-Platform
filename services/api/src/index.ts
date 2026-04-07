import "dotenv/config";
import { getNumberEnv } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import express from "express";
import cors from "cors";
import { webhookRouter } from "./routes/webhook";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";
import { walletRouter } from "./routes/wallet";
import { portfolioRouter } from "./routes/portfolio";
import { marketsRouter } from "./routes/markets";
import { clerkMiddleware } from "@clerk/express";
import { pgPool } from "./db";
import { RedisManager } from "./RedisManager";
import { getApiLiveness, getApiReadiness } from "./health";

const logger = createLogger("api");
export const app = express();
app.use(cors());

app.get("/healthz", (_req, res) => {
  const response = getApiLiveness();
  res.status(response.statusCode).json(response.body);
});

app.get("/readyz", async (_req, res) => {
  const response = await getApiReadiness();
  res.status(response.statusCode).json(response.body);
});

app.use("/api/v1/webhooks", webhookRouter);

app.use(express.json());
app.use(clerkMiddleware());

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/portfolio", portfolioRouter);
app.use("/api/v1/markets", marketsRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/klines", klineRouter);
// write code for below 2 later
app.use("/api/v1/tickers", tickersRouter); //for this handled using websockets, so not needed using api
app.use("/api/v1/trades", tradesRouter);

if (process.env.NODE_ENV !== "test") {
  const port = getNumberEnv("PORT", { defaultValue: 3000 });
  const server = app.listen(port);
  logger.info("API listening", { port });

  const shutdown = async (signal: string) => {
    logger.info("Shutting down API", { signal });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await RedisManager.getInstance().close();
    await pgPool.end();
    process.exit(0);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        logger.error("API shutdown failed", error);
        process.exit(1);
      });
    });
  }
}
