import "dotenv/config";
import express from "express";
import cors from "cors";
import { webhookRouter } from "./routes/webhook";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";
import { clerkMiddleware } from "@clerk/express";

const app = express();
app.use(cors());

app.use("/api/v1/webhooks", webhookRouter);

app.use(express.json());
app.use(clerkMiddleware())

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/klines", klineRouter);
// write code for below 2 later
app.use("/api/v1/tickers", tickersRouter); //for this handled using websockets, so not needed using api
app.use("/api/v1/trades", tradesRouter);

app.listen(process.env.PORT);
console.log(`Listening on port ${process.env.PORT}`);