import "dotenv/config";
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

const logger = createLogger("api");
export const app = express();
app.use(cors());

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
  app.listen(process.env.PORT);
  logger.info("API listening", { port: process.env.PORT });
}
