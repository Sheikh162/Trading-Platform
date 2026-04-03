import { Router } from "express";
import { authMiddleware } from "../middleware";
import { pgPool } from "../db";

export const portfolioRouter = Router();

portfolioRouter.use(authMiddleware);

portfolioRouter.get("/", async (req, res) => {
  const userId = req.userId as string;

  const [balancesResult, assetsResult, fillsResult] = await Promise.all([
    pgPool.query(
      `
        WITH latest_prices AS (
          SELECT DISTINCT ON (market_symbol)
            market_symbol,
            price
          FROM trade_fills
          ORDER BY market_symbol, executed_at DESC
        )
        SELECT
          b.asset,
          b.available::text AS available,
          b.locked::text AS locked,
          COALESCE(lp.price, CASE WHEN b.asset = 'USDT' THEN 1 ELSE 0 END)::text AS last_price
        FROM balances b
        LEFT JOIN latest_prices lp ON lp.market_symbol = b.asset || '_USDT'
        WHERE b.user_id = $1
      `,
      [userId],
    ),
    pgPool.query(
      `SELECT symbol, name, icon_url FROM assets WHERE is_active = TRUE`,
    ),
    pgPool.query(
      `
        SELECT
          CASE WHEN buyer_user_id = $1 THEN buyer_user_id ELSE seller_user_id END AS user_id,
          CASE WHEN buyer_user_id = $1 THEN split_part(market_symbol, '_', 1) ELSE split_part(market_symbol, '_', 1) END AS asset_symbol,
          CASE WHEN buyer_user_id = $1 THEN quantity ELSE -quantity END AS signed_qty,
          CASE WHEN buyer_user_id = $1 THEN quote_quantity ELSE -quote_quantity END AS signed_quote
        FROM trade_fills
        WHERE buyer_user_id = $1 OR seller_user_id = $1
      `,
      [userId],
    ),
  ]);

  const assetMeta = new Map(
    assetsResult.rows.map((row) => [row.symbol, row]),
  );

  const fillAggregate = new Map<
    string,
    { buyQty: number; buyQuote: number }
  >();

  for (const row of fillsResult.rows) {
    const assetSymbol = row.asset_symbol;
    const current = fillAggregate.get(assetSymbol) ?? { buyQty: 0, buyQuote: 0 };
    const signedQty = Number(row.signed_qty);
    const signedQuote = Number(row.signed_quote);
    if (signedQty > 0) {
      current.buyQty += signedQty;
      current.buyQuote += signedQuote;
    }
    fillAggregate.set(assetSymbol, current);
  }

  const positions = balancesResult.rows
    .map((row) => {
      const asset = row.asset;
      const available = Number(row.available);
      const locked = Number(row.locked);
      const balance = available + locked;
      const lastPrice = Number(row.last_price);
      const value = balance * lastPrice;
      const fills = fillAggregate.get(asset) ?? { buyQty: 0, buyQuote: 0 };
      const avgBuyPrice = fills.buyQty > 0 ? fills.buyQuote / fills.buyQty : lastPrice;
      const unrealizedPnLValue = asset === "USDT" ? 0 : (lastPrice - avgBuyPrice) * balance;
      const unrealizedPnL = avgBuyPrice > 0 ? (unrealizedPnLValue / (avgBuyPrice * balance || 1)) * 100 : 0;
      const meta = assetMeta.get(asset);
      const pnlValuePrefix = unrealizedPnLValue > 0 ? "+" : "";
      const pnlPrefix = unrealizedPnL > 0 ? "+" : "";

      return {
        symbol: asset,
        name: meta?.name ?? asset,
        balance: balance.toFixed(8).replace(/\.?0+$/, ""),
        value: value.toFixed(2),
        avgBuyPrice: avgBuyPrice.toFixed(2),
        unrealizedPnL: `${pnlPrefix}${unrealizedPnL.toFixed(2)}%`,
        unrealizedPnLValue: `${pnlValuePrefix}${unrealizedPnLValue.toFixed(2)}`,
        icon: meta?.icon_url ?? "",
      };
    })
    .filter((row) => Number(row.balance) > 0);

  const totalValue = positions.reduce((sum, row) => sum + Number(row.value), 0);

  res.json({
    assets: positions.map((row) => ({
      ...row,
      allocation: totalValue > 0 ? Number(((Number(row.value) / totalValue) * 100).toFixed(2)) : 0,
    })),
  });
});
