import { Client } from "pg";
import { createClient } from "redis";
import { DbMessage } from "./types";
import "dotenv/config";

const pgClient = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});

async function connectToDatabase() {
  try {
    await pgClient.connect();
    console.log("Successfully connected to PostgreSQL database");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
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
  console.log(" Starting DB processor...");
  await connectToDatabase();

  const redisUrl =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

  const redisClient = createClient({ url: redisUrl });

  try {
    await redisClient.connect();
    console.log("Successfully connected to Redis");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    process.exit(1);
  }

  console.log(
    'Starting to listen for messages from Redis queue "db_processor"...',
  );
  let messageCount = 0;

  while (true) {
    try {
      const response = await redisClient.rPop("db_processor" as string);
      if (!response) {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        messageCount++;
        console.log(`\nMessage #${messageCount} received from Redis queue`);

        const parsedResponse: DbMessage = JSON.parse(response);
        console.log("Message type:", parsedResponse.type);

        if (parsedResponse.type === "TRADE_ADDED") {
          const tradeData = parsedResponse.data;
          console.log("Processing trade:");
          console.log("  - isBuyerMaker:", tradeData.isBuyerMaker);
          console.log("  - Trade ID:", tradeData.id);
          console.log("  - Market:", tradeData.market);
          console.log("  - Price:", tradeData.price);
          console.log("  - Quantity:", tradeData.quantity);
          console.log(
            "  - Timestamp:",
            new Date(tradeData.timestamp).toISOString(),
          );

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

          console.log("Trade data successfully inserted into database");
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
          console.log("Skipping message - unsupported type");
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Continue processing other messages
    }
  }
}

main().catch(console.error);
