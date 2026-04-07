import { Router } from "express";
import { pgPool } from "../db";

export const tickersRouter = Router();

tickersRouter.get("/", async (_req, res) => {
    const result = await pgPool.query(
        `
            WITH latest_prices AS (
                SELECT DISTINCT ON (market_symbol)
                    market_symbol,
                    price,
                    executed_at
                FROM trade_fills
                ORDER BY market_symbol, executed_at DESC
            ),
            day_old_prices AS (
                SELECT DISTINCT ON (market_symbol)
                    market_symbol,
                    price
                FROM trade_fills
                WHERE executed_at <= NOW() - INTERVAL '24 hours'
                ORDER BY market_symbol, executed_at DESC
            ),
            volume_24h AS (
                SELECT
                    market_symbol,
                    COALESCE(SUM(quantity), 0) AS volume,
                    COALESCE(SUM(quote_quantity), 0) AS quote_volume,
                    COUNT(*) AS trades
                FROM trade_fills
                WHERE executed_at >= NOW() - INTERVAL '24 hours'
                GROUP BY market_symbol
            )
            SELECT
                m.symbol,
                COALESCE(lp.price, 0) AS last_price,
                COALESCE(dop.price, lp.price, 0) AS first_price,
                COALESCE(v.volume, 0) AS volume,
                COALESCE(v.quote_volume, 0) AS quote_volume,
                COALESCE(v.trades, 0) AS trades
            FROM markets m
            LEFT JOIN latest_prices lp ON lp.market_symbol = m.symbol
            LEFT JOIN day_old_prices dop ON dop.market_symbol = m.symbol
            LEFT JOIN volume_24h v ON v.market_symbol = m.symbol
            WHERE m.status = 'active'
            ORDER BY m.symbol
        `,
    );

    res.json(result.rows.map((row) => {
        const firstPrice = Number(row.first_price);
        const lastPrice = Number(row.last_price);
        const priceChange = lastPrice - firstPrice;
        const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

        return {
            symbol: row.symbol,
            firstPrice: firstPrice.toFixed(2),
            lastPrice: lastPrice.toFixed(2),
            high: lastPrice.toFixed(2),
            low: firstPrice.toFixed(2),
            priceChange: priceChange.toFixed(2),
            priceChangePercent: priceChangePercent.toFixed(2),
            volume: Number(row.volume).toFixed(8),
            quoteVolume: Number(row.quote_volume).toFixed(2),
            trades: String(row.trades),
        };
    }));
});
