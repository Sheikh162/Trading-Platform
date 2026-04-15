import { Router } from "express";
import { ON_RAMP, WITHDRAW } from "@trading-platform/shared-types";
import type { PoolClient } from "pg";
import { authMiddleware } from "../middleware";
import { ensureUserExists, pgPool, withTransaction } from "../db";
import { RedisManager } from "../RedisManager";
import {
  parseAsset,
  parseOptionalString,
  parsePositiveInteger,
  parsePositiveNumber,
} from "../validation";

export const walletRouter = Router();

walletRouter.use(authMiddleware);

async function ensureBalanceRow(
  client: PoolClient,
  userId: string,
  asset: string,
) {
  await ensureUserExists(client, userId);
  await client.query(
    `
      INSERT INTO balances (user_id, asset, available, locked)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (user_id, asset) DO NOTHING
    `,
    [userId, asset],
  );
}

walletRouter.get("/balances", async (req, res) => {
  const userId = req.userId as string;

  const result = await pgPool.query(
    `
      SELECT
        b.asset,
        b.available::text AS available,
        b.locked::text AS locked
      FROM balances b
      WHERE b.user_id = $1
      ORDER BY b.asset
    `,
    [userId],
  );

  res.json({ balances: result.rows });
});

walletRouter.get("/transactions", async (req, res) => {
  const userId = req.userId as string;
  const parsedLimit = parsePositiveInteger(req.query.limit, "limit", {
    defaultValue: 50,
    min: 1,
    max: 100,
  });
  if (!parsedLimit.success) {
    return res.status(400).json({ message: parsedLimit.message });
  }

  const limit = parsedLimit.data;

  const result = await pgPool.query(
    `
      SELECT
        wl.id,
        wl.entry_type,
        wl.asset_symbol,
        wl.amount::text AS amount,
        wl.reference_table,
        wl.reference_id,
        wl.created_at,
        wl.metadata,
        CASE
          WHEN wl.reference_table = 'deposits' THEN COALESCE(d.status::text, 'completed')
          WHEN wl.reference_table = 'withdrawals' THEN COALESCE(w.status::text, 'completed')
          ELSE 'completed'
        END AS status
      FROM wallet_ledger wl
      LEFT JOIN deposits d ON wl.reference_table = 'deposits' AND wl.reference_id = d.id::text
      LEFT JOIN withdrawals w ON wl.reference_table = 'withdrawals' AND wl.reference_id = w.id::text
      WHERE wl.user_id = $1
      ORDER BY wl.created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  res.json({
    transactions: result.rows.map((row) => ({
      id: String(row.id),
      type: row.entry_type,
      asset: row.asset_symbol,
      amount: row.amount,
      status: String(row.status).toUpperCase(),
      timestamp: new Date(row.created_at).getTime(),
      details: row.metadata?.details ?? `${row.entry_type} ${row.asset_symbol}`,
      referenceTable: row.reference_table,
      referenceId: row.reference_id,
    })),
  });
});

walletRouter.get("/summary", async (req, res) => {
  const userId = req.userId as string;

  const [balancesResult, openOrdersResult, performerResult] = await Promise.all([
    pgPool.query(
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
        )
        SELECT
          b.asset,
          b.available,
          b.locked,
          COALESCE(lp.price, CASE WHEN b.asset = 'USDT' THEN 1 ELSE 0 END) AS last_price,
          COALESCE(pp.price, lp.price, CASE WHEN b.asset = 'USDT' THEN 1 ELSE 0 END) AS previous_price
        FROM balances b
        LEFT JOIN latest_prices lp ON lp.market_symbol = b.asset || '_USDT'
        LEFT JOIN previous_prices pp ON pp.market_symbol = b.asset || '_USDT'
        WHERE b.user_id = $1
      `,
      [userId],
    ),
    pgPool.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1 AND status IN ('open', 'partially_filled')`,
      [userId],
    ),
    pgPool.query(
      `
        WITH latest_prices AS (
          SELECT DISTINCT ON (m.symbol)
            m.symbol,
            m.base_asset,
            COALESCE(tf.price, 0) AS last_price
          FROM markets m
          LEFT JOIN trade_fills tf ON tf.market_symbol = m.symbol
          ORDER BY m.symbol, tf.executed_at DESC NULLS LAST
        ),
        day_old_prices AS (
          SELECT DISTINCT ON (m.symbol)
            m.symbol,
            COALESCE(tf.price, 0) AS day_old_price
          FROM markets m
          LEFT JOIN trade_fills tf
            ON tf.market_symbol = m.symbol
           AND tf.executed_at <= NOW() - INTERVAL '24 hours'
          ORDER BY m.symbol, tf.executed_at DESC NULLS LAST
        )
        SELECT
          lp.base_asset AS symbol,
          CASE
            WHEN COALESCE(dp.day_old_price, 0) = 0 THEN 0
            ELSE ROUND(((lp.last_price - dp.day_old_price) / dp.day_old_price) * 100, 2)
          END AS change_pct
        FROM latest_prices lp
        LEFT JOIN day_old_prices dp ON dp.symbol = lp.symbol
        ORDER BY change_pct DESC
        LIMIT 1
      `,
    ),
  ]);

  let totalCurrent = 0;
  let totalPrevious = 0;

  for (const row of balancesResult.rows) {
    const totalUnits = Number(row.available) + Number(row.locked);
    const lastPrice = Number(row.last_price);
    const previousPrice = Number(row.previous_price);
    totalCurrent += totalUnits * lastPrice;
    totalPrevious += totalUnits * previousPrice;
  }

  const pnl24h = totalCurrent - totalPrevious;
  const pnl24hPercent = totalPrevious > 0 ? (pnl24h / totalPrevious) * 100 : 0;

  const bestPerformer = performerResult.rows[0] ?? {
    symbol: "USDT",
    change_pct: "0",
  };

  res.json({
    totalBalance: totalCurrent.toFixed(2),
    pnl24h: pnl24h.toFixed(2),
    pnl24hPercent: pnl24hPercent.toFixed(2),
    openOrders: openOrdersResult.rows[0]?.count ?? 0,
    bestPerformer: {
      symbol: bestPerformer.symbol,
      change: Number(bestPerformer.change_pct).toFixed(2),
    },
  });
});

walletRouter.post("/deposits", async (req, res) => {
  const userId = req.userId as string;
  const parsedAsset = parseAsset(req.body.asset);
  if (!parsedAsset.success) {
    return res.status(400).json({ message: parsedAsset.message });
  }

  const parsedAmount = parsePositiveNumber(req.body.amount, "amount");
  if (!parsedAmount.success) {
    return res.status(400).json({ message: parsedAmount.message });
  }

  const asset = parsedAsset.data;
  const amount = parsedAmount.data;
  const provider = parseOptionalString(req.body.provider) ?? "manual";

  const deposit = await withTransaction(async (client) => {
    await ensureBalanceRow(client, userId, asset);

    const depositResult = await client.query(
      `
        INSERT INTO deposits (user_id, asset_symbol, amount, status, provider, provider_ref, requested_at, completed_at, metadata)
        VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), NOW(), $6)
        RETURNING id, amount::text AS amount, status::text AS status, asset_symbol
      `,
      [
        userId,
        asset,
        amount,
        provider,
        `dep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        JSON.stringify({ details: `${asset} deposit` }),
      ],
    );

    const balanceResult = await client.query(
      `
        UPDATE balances
        SET available = available + $3, updated_at = NOW()
        WHERE user_id = $1 AND asset = $2
        RETURNING available::text AS available, locked::text AS locked
      `,
      [userId, asset, amount],
    );

    await client.query(
      `
        INSERT INTO wallet_ledger (
          user_id, asset_symbol, entry_type, amount,
          balance_after_available, balance_after_locked,
          reference_table, reference_id, metadata
        )
        VALUES ($1, $2, 'deposit_credit', $3, $4, $5, 'deposits', $6, $7)
      `,
      [
        userId,
        asset,
        amount,
        balanceResult.rows[0].available,
        balanceResult.rows[0].locked,
        String(depositResult.rows[0].id),
        JSON.stringify({ details: `${asset} deposit completed` }),
      ],
    );

    return {
      id: depositResult.rows[0].id,
      status: depositResult.rows[0].status,
      asset: depositResult.rows[0].asset_symbol,
      amount: depositResult.rows[0].amount,
    };
  });

  RedisManager.getInstance().pushMessage({
    type: ON_RAMP,
    data: {
      asset,
      userId,
      amount: amount.toString(),
      txnId: `deposit_${deposit.id}`,
    },
  });

  return res.status(201).json(deposit);
});

walletRouter.post("/withdrawals", async (req, res) => {
  const userId = req.userId as string;
  const parsedAsset = parseAsset(req.body.asset);
  if (!parsedAsset.success) {
    return res.status(400).json({ message: parsedAsset.message });
  }

  const parsedAmount = parsePositiveNumber(req.body.amount, "amount");
  if (!parsedAmount.success) {
    return res.status(400).json({ message: parsedAmount.message });
  }

  const asset = parsedAsset.data;
  const amount = parsedAmount.data;
  const destinationType = parseOptionalString(req.body.destinationType) ?? "manual";
  const destinationRef = parseOptionalString(req.body.destinationRef) ?? null;

  try {
    const withdrawal = await withTransaction(async (client) => {
      await ensureBalanceRow(client, userId, asset);

      const balanceResult = await client.query(
        `
          UPDATE balances
          SET available = available - $3, updated_at = NOW()
          WHERE user_id = $1 AND asset = $2 AND available >= $3
          RETURNING available::text AS available, locked::text AS locked
        `,
        [userId, asset, amount],
      );

      if (balanceResult.rowCount === 0) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const withdrawalResult = await client.query(
        `
          INSERT INTO withdrawals (
            user_id, asset_symbol, amount, status,
            destination_type, destination_ref, provider_ref,
            requested_at, processed_at, metadata
          )
          VALUES ($1, $2, $3, 'completed', $4, $5, $6, NOW(), NOW(), $7)
          RETURNING id, amount::text AS amount, status::text AS status, asset_symbol
        `,
        [
          userId,
          asset,
          amount,
          destinationType,
          destinationRef,
          `wd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          JSON.stringify({ details: `${asset} withdrawal completed` }),
        ],
      );

      await client.query(
        `
          INSERT INTO wallet_ledger (
            user_id, asset_symbol, entry_type, amount,
            balance_after_available, balance_after_locked,
            reference_table, reference_id, metadata
          )
          VALUES ($1, $2, 'withdrawal_debit', $3, $4, $5, 'withdrawals', $6, $7)
        `,
        [
          userId,
          asset,
          -amount,
          balanceResult.rows[0].available,
          balanceResult.rows[0].locked,
          String(withdrawalResult.rows[0].id),
          JSON.stringify({ details: `${asset} withdrawal completed` }),
        ],
      );

      return {
        id: withdrawalResult.rows[0].id,
        status: withdrawalResult.rows[0].status,
        asset: withdrawalResult.rows[0].asset_symbol,
        amount: withdrawalResult.rows[0].amount,
      };
    });

    RedisManager.getInstance().pushMessage({
      type: WITHDRAW,
      data: {
        userId,
        amount: amount.toString(),
      },
    });

    return res.status(201).json(withdrawal);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    throw error;
  }
});
