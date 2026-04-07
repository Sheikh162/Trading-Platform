import { Client } from "pg";
import http from "node:http";
import { createClient } from "redis";
import { getPostgresConfig, getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import { DbMessage } from "@trading-platform/shared-types";
import "dotenv/config";

const logger = createLogger("persistence");
const pgClient = new Client(getPostgresConfig());
let ready = false;
let shuttingDown = false;

async function connectToDatabase() {
  try {
    await pgClient.connect();
    logger.info("Connected to PostgreSQL");
  } catch (error) {
    logger.error("Failed to connect to PostgreSQL", error);
    process.exit(1);
  }
}

async function ensureBalanceRow(userId: string, asset: string) {
  await pgClient.query(
    `
      INSERT INTO users (id)
      VALUES ($1)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId],
  );
  await pgClient.query(
    `
      INSERT INTO balances (user_id, asset, available, locked)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (user_id, asset) DO NOTHING
    `,
    [userId, asset],
  );
}

async function mutateBalance(
  userId: string,
  asset: string,
  availableDelta: number,
  lockedDelta: number,
) {
  await ensureBalanceRow(userId, asset);
  const result = await pgClient.query(
    `
      UPDATE balances
      SET
        available = available + $3,
        locked = locked + $4,
        updated_at = NOW()
      WHERE user_id = $1 AND asset = $2
      RETURNING available::text AS available, locked::text AS locked
    `,
    [userId, asset, availableDelta, lockedDelta],
  );

  return result.rows[0];
}

async function insertLedgerEntry(params: {
  userId: string;
  asset: string;
  entryType:
    | "order_lock"
    | "order_unlock"
    | "trade_debit"
    | "trade_credit"
    | "deposit_credit"
    | "withdrawal_debit"
    | "withdrawal_reversal"
    | "fee_debit";
  amount: number;
  balanceAfterAvailable: string;
  balanceAfterLocked: string;
  referenceTable: string;
  referenceId: string;
  details: string;
}) {
  await pgClient.query(
    `
      INSERT INTO wallet_ledger (
        user_id, asset_symbol, entry_type, amount,
        balance_after_available, balance_after_locked,
        reference_table, reference_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      params.userId,
      params.asset,
      params.entryType,
      params.amount,
      params.balanceAfterAvailable,
      params.balanceAfterLocked,
      params.referenceTable,
      params.referenceId,
      JSON.stringify({ details: params.details }),
    ],
  );
}

async function main() {
  logger.info("Starting persistence worker");
  await connectToDatabase();
  const redisClient = createClient({ url: getRedisUrl() });

  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (error) {
    logger.error("Failed to connect to Redis", error);
    process.exit(1);
  }

  logger.info('Listening to Redis queue "db_processor"');
  ready = true;
  let messageCount = 0;

  const healthPort = Number(process.env.HEALTH_PORT || 8083);
  const healthServer = http.createServer((req, res) => {
    if (req.url !== "/healthz" && req.url !== "/readyz") {
      res.writeHead(404);
      res.end();
      return;
    }

    const statusCode = ready && !shuttingDown ? 200 : 503;
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: statusCode === 200 ? "ok" : "error",
        service: "persistence",
      }),
    );
  });

  healthServer.listen(healthPort, () => {
    logger.info("Persistence health server listening", { port: healthPort });
  });

  const shutdown = async (signal: string) => {
    shuttingDown = true;
    ready = false;
    logger.info("Shutting down persistence worker", { signal });
    await healthServer.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => {
      healthServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await Promise.allSettled([redisClient.quit(), pgClient.end()]);
    process.exit(0);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        logger.error("Persistence shutdown failed", error);
        process.exit(1);
      });
    });
  }

  while (!shuttingDown) {
    try {
      const response = await redisClient.rPop("db_processor" as string);
      if (!response) {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        messageCount++;
        logger.info("Message received from Redis queue", { messageCount });

        const parsedResponse: DbMessage = JSON.parse(response);
        logger.info("Processing message", { type: parsedResponse.type });

        if (parsedResponse.type === "TRADE_ADDED") {
          const tradeData = parsedResponse.data;
          logger.info("Processing trade", {
            tradeId: tradeData.id,
            market: tradeData.market,
            price: tradeData.price,
            quantity: tradeData.quantity,
            timestamp: new Date(tradeData.timestamp).toISOString(),
          });

          const price = parseFloat(tradeData.price);
          const timestamp = new Date(tradeData.timestamp);
          const volume = parseFloat(tradeData.quantity);
          const market = tradeData.market;

          await pgClient.query("BEGIN");
          try {
            for (const userId of [
              tradeData.makerUserId,
              tradeData.takerUserId,
              tradeData.buyerUserId,
              tradeData.sellerUserId,
            ]) {
              await pgClient.query(
                `
                  INSERT INTO users (id)
                  VALUES ($1)
                  ON CONFLICT (id) DO NOTHING
                `,
                [userId],
              );
            }

            const insertTradeFillResult = await pgClient.query(
              `
                INSERT INTO trade_fills (
                  trade_id, market_symbol, price, quantity, quote_quantity,
                  maker_order_id, taker_order_id,
                  maker_user_id, taker_user_id, buyer_user_id, seller_user_id,
                  executed_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (trade_id) DO NOTHING
                RETURNING trade_id
              `,
              [
                tradeData.id,
                market,
                tradeData.price,
                tradeData.quantity,
                tradeData.quoteQuantity,
                tradeData.makerOrderId,
                tradeData.takerOrderId,
                tradeData.makerUserId,
                tradeData.takerUserId,
                tradeData.buyerUserId,
                tradeData.sellerUserId,
                timestamp,
              ],
            );
            await pgClient.query(
              "INSERT INTO trades (time, price, volume, currency_code) VALUES ($1, $2, $3, $4)",
              [timestamp, price, volume, market],
            );

            if (insertTradeFillResult.rowCount && insertTradeFillResult.rowCount > 0) {
              const [baseAsset, quoteAsset] = market.split("_");
              const qty = parseFloat(tradeData.quantity);
              const quoteQty = parseFloat(tradeData.quoteQuantity);
              const buyerIsTaker = tradeData.buyerUserId === tradeData.takerUserId;

              if (buyerIsTaker) {
                const takerQuote = await mutateBalance(
                  tradeData.takerUserId,
                  quoteAsset,
                  0,
                  -quoteQty,
                );
                const takerBase = await mutateBalance(
                  tradeData.takerUserId,
                  baseAsset,
                  qty,
                  0,
                );
                const makerBase = await mutateBalance(
                  tradeData.makerUserId,
                  baseAsset,
                  0,
                  -qty,
                );
                const makerQuote = await mutateBalance(
                  tradeData.makerUserId,
                  quoteAsset,
                  quoteQty,
                  0,
                );

                await insertLedgerEntry({
                  userId: tradeData.takerUserId,
                  asset: quoteAsset,
                  entryType: "trade_debit",
                  amount: -quoteQty,
                  balanceAfterAvailable: takerQuote.available,
                  balanceAfterLocked: takerQuote.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Bought ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.takerUserId,
                  asset: baseAsset,
                  entryType: "trade_credit",
                  amount: qty,
                  balanceAfterAvailable: takerBase.available,
                  balanceAfterLocked: takerBase.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Bought ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.makerUserId,
                  asset: baseAsset,
                  entryType: "trade_debit",
                  amount: -qty,
                  balanceAfterAvailable: makerBase.available,
                  balanceAfterLocked: makerBase.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Sold ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.makerUserId,
                  asset: quoteAsset,
                  entryType: "trade_credit",
                  amount: quoteQty,
                  balanceAfterAvailable: makerQuote.available,
                  balanceAfterLocked: makerQuote.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Sold ${qty} ${baseAsset}`,
                });
              } else {
                const takerBase = await mutateBalance(
                  tradeData.takerUserId,
                  baseAsset,
                  0,
                  -qty,
                );
                const takerQuote = await mutateBalance(
                  tradeData.takerUserId,
                  quoteAsset,
                  quoteQty,
                  0,
                );
                const makerQuote = await mutateBalance(
                  tradeData.makerUserId,
                  quoteAsset,
                  0,
                  -quoteQty,
                );
                const makerBase = await mutateBalance(
                  tradeData.makerUserId,
                  baseAsset,
                  qty,
                  0,
                );

                await insertLedgerEntry({
                  userId: tradeData.takerUserId,
                  asset: baseAsset,
                  entryType: "trade_debit",
                  amount: -qty,
                  balanceAfterAvailable: takerBase.available,
                  balanceAfterLocked: takerBase.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Sold ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.takerUserId,
                  asset: quoteAsset,
                  entryType: "trade_credit",
                  amount: quoteQty,
                  balanceAfterAvailable: takerQuote.available,
                  balanceAfterLocked: takerQuote.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Sold ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.makerUserId,
                  asset: quoteAsset,
                  entryType: "trade_debit",
                  amount: -quoteQty,
                  balanceAfterAvailable: makerQuote.available,
                  balanceAfterLocked: makerQuote.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Bought ${qty} ${baseAsset}`,
                });
                await insertLedgerEntry({
                  userId: tradeData.makerUserId,
                  asset: baseAsset,
                  entryType: "trade_credit",
                  amount: qty,
                  balanceAfterAvailable: makerBase.available,
                  balanceAfterLocked: makerBase.locked,
                  referenceTable: "trade_fills",
                  referenceId: tradeData.id,
                  details: `Bought ${qty} ${baseAsset}`,
                });
              }
            }
            await pgClient.query("COMMIT");
          } catch (error) {
            await pgClient.query("ROLLBACK");
            throw error;
          }

          logger.info("Trade data inserted into database", {
            tradeId: tradeData.id,
          });
        } else if (parsedResponse.type === "ORDER_UPDATE") {
          const orderData = parsedResponse.data;

          if (
            orderData.market &&
            orderData.price &&
            orderData.quantity &&
            orderData.side &&
            orderData.userId
          ) {
            const existingOrder = await pgClient.query(
              `SELECT id FROM orders WHERE id = $1`,
              [orderData.orderId],
            );
            const initialFilled = orderData.executedQty ?? 0;
            const status =
              orderData.status ??
              (initialFilled === 0
                ? "open"
                : Number(orderData.quantity) <= initialFilled
                  ? "filled"
                  : "partially_filled");

            await pgClient.query(
              `
                INSERT INTO orders (
                  id, user_id, market_symbol, side, type, price, quantity,
                  filled_quantity, status, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, 'limit', $5, $6, $7, $8, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE
                SET
                  price = EXCLUDED.price,
                  quantity = EXCLUDED.quantity,
                  filled_quantity = EXCLUDED.filled_quantity,
                  status = EXCLUDED.status,
                  updated_at = NOW()
              `,
              [
                orderData.orderId,
                orderData.userId,
                orderData.market,
                orderData.side,
                orderData.price,
                orderData.quantity,
                initialFilled,
                status,
              ],
            );

            if (existingOrder.rows.length === 0) {
              await pgClient.query(
                `
                  INSERT INTO users (id)
                  VALUES ($1)
                  ON CONFLICT (id) DO NOTHING
                `,
                [orderData.userId],
              );
              const [baseAsset, quoteAsset] = orderData.market.split("_");
              if (orderData.side === "buy") {
                const totalQuote = Number(orderData.price) * Number(orderData.quantity);
                const updatedBalance = await mutateBalance(
                  orderData.userId,
                  quoteAsset,
                  -totalQuote,
                  totalQuote,
                );
                await insertLedgerEntry({
                  userId: orderData.userId,
                  asset: quoteAsset,
                  entryType: "order_lock",
                  amount: -totalQuote,
                  balanceAfterAvailable: updatedBalance.available,
                  balanceAfterLocked: updatedBalance.locked,
                  referenceTable: "orders",
                  referenceId: orderData.orderId,
                  details: `Locked funds for ${orderData.market} buy order`,
                });
              } else {
                const quantity = Number(orderData.quantity);
                const updatedBalance = await mutateBalance(
                  orderData.userId,
                  baseAsset,
                  -quantity,
                  quantity,
                );
                await insertLedgerEntry({
                  userId: orderData.userId,
                  asset: baseAsset,
                  entryType: "order_lock",
                  amount: -quantity,
                  balanceAfterAvailable: updatedBalance.available,
                  balanceAfterLocked: updatedBalance.locked,
                  referenceTable: "orders",
                  referenceId: orderData.orderId,
                  details: `Locked funds for ${orderData.market} sell order`,
                });
              }
            }
          } else if (orderData.status === "cancelled") {
            const orderResult = await pgClient.query(
              `
                SELECT
                  id,
                  user_id,
                  market_symbol,
                  side,
                  price::text AS price,
                  quantity::text AS quantity,
                  filled_quantity::text AS filled_quantity,
                  status::text AS status
                FROM orders
                WHERE id = $1
              `,
              [orderData.orderId],
            );

            if (orderResult.rows.length > 0 && orderResult.rows[0].status !== "cancelled") {
              const existingOrder = orderResult.rows[0];
              const [baseAsset, quoteAsset] = existingOrder.market_symbol.split("_");
              const remainingQty =
                Number(existingOrder.quantity) - Number(existingOrder.filled_quantity);

              if (remainingQty > 0) {
                if (existingOrder.side === "buy") {
                  const refund = remainingQty * Number(existingOrder.price);
                  const balance = await mutateBalance(
                    existingOrder.user_id,
                    quoteAsset,
                    refund,
                    -refund,
                  );
                  await insertLedgerEntry({
                    userId: existingOrder.user_id,
                    asset: quoteAsset,
                    entryType: "order_unlock",
                    amount: refund,
                    balanceAfterAvailable: balance.available,
                    balanceAfterLocked: balance.locked,
                    referenceTable: "orders",
                    referenceId: existingOrder.id,
                    details: `Unlocked funds for cancelled ${existingOrder.market_symbol} buy order`,
                  });
                } else {
                  const balance = await mutateBalance(
                    existingOrder.user_id,
                    baseAsset,
                    remainingQty,
                    -remainingQty,
                  );
                  await insertLedgerEntry({
                    userId: existingOrder.user_id,
                    asset: baseAsset,
                    entryType: "order_unlock",
                    amount: remainingQty,
                    balanceAfterAvailable: balance.available,
                    balanceAfterLocked: balance.locked,
                    referenceTable: "orders",
                    referenceId: existingOrder.id,
                    details: `Unlocked funds for cancelled ${existingOrder.market_symbol} sell order`,
                  });
                }
              }
            }

            await pgClient.query(
              `
                UPDATE orders
                SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
                WHERE id = $1
              `,
              [orderData.orderId],
            );
          } else if (typeof orderData.executedQty === "number") {
            await pgClient.query(
              `
                UPDATE orders
                SET
                  filled_quantity = LEAST(quantity, filled_quantity + $2),
                  status = CASE
                    WHEN LEAST(quantity, filled_quantity + $2) >= quantity THEN 'filled'
                    WHEN LEAST(quantity, filled_quantity + $2) > 0 THEN 'partially_filled'
                    ELSE status
                  END,
                  updated_at = NOW()
                WHERE id = $1
              `,
              [orderData.orderId, orderData.executedQty],
            );
          }
        } else {
          logger.warn("Skipping unsupported message");
        }
      }
    } catch (error) {
      logger.error("Error processing persistence message", error);
    }
  }
}

main().catch((error) => {
  logger.error("Persistence worker failed", error);
  process.exit(1);
});
