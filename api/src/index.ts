import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
/* app.use("/api/v1/klines", klineRouter);
 */app.use("/api/v1/tickers", tickersRouter);


app.listen(3000,'0.0.0.0',() => {
});

// 0.0.0.0 will broadcast therefore anyone connected to the same wifi who puts ip of the device and port instead of locahost will be able to send post request