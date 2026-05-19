import fs from "fs";
import { Client } from "pg";
import { getPostgresConfig } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import {
  CANCEL_ORDER,
  CREATE_ORDER,
  Fill,
  GET_BALANCE,
  GET_DEPTH,
  GET_OPEN_ORDERS,
  MessageToEngine,
  OpenOrder as Order,
  ON_RAMP,
  ORDER_UPDATE,
  TRADE_ADDED,
  USER_CREATED,
  WITHDRAW,
} from "@trading-platform/shared-types";
import { RedisManager } from "../RedisManager";
import { Orderbook } from "./Orderbook";

export const BASE_CURRENCY = "USDT";
const logger = createLogger("engine");

interface UserBalance {
    [key: string]: {
        available: number;
        locked: number;
    }
}

interface PersistedOpenOrderRow {
    id: string;
    user_id: string;
    market_symbol: string;
    side: "buy" | "sell";
    price: string;
    quantity: string;
    filled_quantity: string;
}

export class Engine {
    private orderbooks: Orderbook[] = []; // BTC_USDT etc orderbook is basically like broker, who manages the 2 parties i.e the buyer and seller.
    private balances: Map<string, UserBalance> = new Map(); // userid is key, userbalance interface is the value
    private snapshotInterval: NodeJS.Timeout;
    private withSnapshot: boolean;
    private snapshotFile: string;

    constructor() {
        let snapshot = null  // snapshot is a JSON which consists of orderbooks(array of orderbook), and balances(array of balance of each user)
        this.withSnapshot = process.env.WITH_SNAPSHOT === "true";
        this.snapshotFile = process.env.SNAPSHOT_FILE || "./snapshot.json";

        try {
            if (this.withSnapshot && fs.existsSync(this.snapshotFile)) {
                snapshot = fs.readFileSync(this.snapshotFile);
                logger.info("Loaded engine snapshot", { snapshotFile: this.snapshotFile });
            }
        } catch (e) {
            logger.warn("Snapshot load skipped");
        }

        if (snapshot) {
            const parsedSnapshot = JSON.parse(snapshot.toString()); //  snapshot type is buffer, thats why we are stringifyng it and parsing it again
            this.orderbooks = parsedSnapshot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(parsedSnapshot.balances);
        } else {
            this.orderbooks = [new Orderbook(`BTC`, [], [], 0, 0)];
        }
        this.snapshotInterval = setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 5);
    }

    async hydrateFromDb() {
        const client = new Client(getPostgresConfig());

        await client.connect();
        try {
            const [marketsResult, balancesResult, openOrdersResult, tradeStateResult] = await Promise.all([
                client.query(`
                    SELECT symbol
                    FROM markets
                    WHERE status = 'active'
                    ORDER BY symbol
                `),
                client.query(`
                    SELECT user_id, asset, available::text AS available, locked::text AS locked
                    FROM balances
                    ORDER BY user_id, asset
                `),
                client.query(`
                    SELECT id, user_id, market_symbol, side, price::text AS price, quantity::text AS quantity, filled_quantity::text AS filled_quantity
                    FROM orders
                    WHERE status IN ('open', 'partially_filled')
                    ORDER BY created_at ASC
                `),
                client.query(`
                    SELECT DISTINCT ON (market_symbol)
                        market_symbol,
                        COALESCE(
                            MAX((trade_id)::bigint) OVER (PARTITION BY market_symbol) + 1,
                            0
                        )::int AS next_trade_id,
                        price::text AS latest_price
                    FROM trade_fills
                    ORDER BY market_symbol, executed_at DESC
                `),
            ]);

            const marketSymbols = marketsResult.rows.map((row: { symbol: string }) => row.symbol);
            const existing = new Set(this.orderbooks.map((orderbook) => orderbook.ticker()));
            const tradeStateByMarket = new Map(
                tradeStateResult.rows.map((row: { market_symbol: string; next_trade_id: number; latest_price: string }) => [
                    row.market_symbol,
                    {
                        nextTradeId: Number(row.next_trade_id),
                        latestPrice: Number(row.latest_price),
                    },
                ]),
            );

            if (this.orderbooks.length === 1 && this.orderbooks[0]?.ticker() === "BTC_USDT" && marketSymbols.includes("BTC_USDT")) {
                existing.add("BTC_USDT");
            }

            for (const symbol of marketSymbols) {
                if (!existing.has(symbol)) {
                    const [baseAsset] = symbol.split("_");
                    const tradeState = tradeStateByMarket.get(symbol);
                    this.orderbooks.push(
                        new Orderbook(
                            baseAsset,
                            [],
                            [],
                            tradeState?.nextTradeId ?? 0,
                            tradeState?.latestPrice ?? 0,
                        ),
                    );
                }
            }

            for (const orderbook of this.orderbooks) {
                const tradeState = tradeStateByMarket.get(orderbook.ticker());
                if (!tradeState) {
                    continue;
                }
                orderbook.lastTradeId = tradeState.nextTradeId;
                orderbook.tickerPrice = tradeState.latestPrice;
            }

            const hydratedBalances = new Map<string, UserBalance>();
            for (const row of balancesResult.rows) {
                const userId = row.user_id as string;
                const asset = row.asset as string;
                const userBalance = hydratedBalances.get(userId) ?? {};
                userBalance[asset] = {
                    available: Number(row.available),
                    locked: Number(row.locked),
                };
                hydratedBalances.set(userId, userBalance);
            }

            this.balances = hydratedBalances;
            this.restoreOpenOrders(openOrdersResult.rows as PersistedOpenOrderRow[]);
            logger.info("Engine hydrated from PostgreSQL", {
                users: this.balances.size,
                markets: marketSymbols.length,
            });
            if (openOrdersResult.rows.length > 0) {
                logger.info("Restored open orders into memory", {
                    count: openOrdersResult.rows.length,
                });
            } else {
                logger.info("No open orders found at startup");
            }
        } finally {
            await client.end();
        }
    }

    saveSnapshot() {
        if (!this.withSnapshot) {
            return;
        }
        const toSnapshot = {
            orderbooks: this.orderbooks.map(o => o.getOrderbookDetailsForSnapshot()),
            balances: Array.from(this.balances.entries())
        }
        fs.writeFileSync(this.snapshotFile, JSON.stringify(toSnapshot));// while writing stringify, while reading parse(.tostring), since buffer while reading
    }

    close() {
        clearInterval(this.snapshotInterval);
        this.saveSnapshot();
    }

    process({ message, clientId }: { message: MessageToEngine, clientId: string }) {
        switch (message.type) {
            case USER_CREATED:
                this.createUser(message.data.userId);
                logger.info("User created in engine", {
                    userId: message.data.userId,
                    totalUsers: this.balances.size,
                });
                break;
            case CREATE_ORDER:
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data);
                    RedisManager.getInstance().sendToApi(clientId, { // this client id was sent from sendAndAwait fn in RedisManager api folder
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills,
                        }
                    });
                } catch (e) {
                    logger.error("Create order failed", e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: "0",
                            remainingQty: "0"
                        }
                    });
                }
                break;
            case CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const cancelMarket = message.data.market;
                    const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket);
                    if (!cancelOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    const baseAsset = cancelMarket.split("_")[0];
                    const quoteAsset = cancelMarket.split("_")[1];

                    //finding order from asks, bids from the orderbook
                    const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);
                    if (!order) {
                        logger.warn("Cancel missed in-memory order", {
                            orderId,
                            market: cancelMarket,
                            inMemoryBids: cancelOrderbook.bids.length,
                            inMemoryAsks: cancelOrderbook.asks.length,
                        });
                        throw new Error("No order found");
                    }

                    if (order.side === "buy") {
                        const price = cancelOrderbook.cancelBid(order)
                        const remainingQuoteAmount = (Number(order.quantity) - Number(order.filled)) * Number(order.price);
                        
                        const userBalance = this.balances.get(order.userId);
                        if (userBalance && userBalance[quoteAsset]) {
                            userBalance[quoteAsset].available += remainingQuoteAmount;
                            userBalance[quoteAsset].locked -= remainingQuoteAmount;
                        }
                        
                        if (price) {
                            this.sendUpdatedDepthAt(price, cancelMarket);
                        }
                    } else {
                        const price = cancelOrderbook.cancelAsk(order)
                        const remainingBaseAmount = Number(order.quantity) - Number(order.filled);
                        
                        const userBalance = this.balances.get(order.userId);
                        if (userBalance && userBalance[baseAsset]) {
                            userBalance[baseAsset].available += remainingBaseAmount;
                            userBalance[baseAsset].locked -= remainingBaseAmount;
                        }

                        if (price) {
                            this.sendUpdatedDepthAt(price, cancelMarket);
                        }
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: "0",
                            remainingQty: "0"
                        }
                    });
                    RedisManager.getInstance().pushMessage({
                        type: ORDER_UPDATE,
                        data: {
                            orderId,
                            status: "cancelled",
                        }
                    });
                } catch (e) {
                    logger.error("Cancel order failed", e);
                }
                break;
            case GET_OPEN_ORDERS:
                try {
                    const openOrderbook = this.orderbooks.find(o => o.ticker() === message.data.market);
                    if (!openOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    const openOrders = openOrderbook.getOpenOrders(message.data.userId);

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders
                    });
                } catch (e) {
                    logger.error("Get open orders failed", e);
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const asset = message.data.asset;
                const amount = Number(message.data.amount);
                this.onRamp(userId, asset, amount);
                break;
            case WITHDRAW:
                this.withdraw(message.data.userId, Number(message.data.amount));
                break;
            case GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: orderbook.getDepth()
                    });
                } catch (e) {
                    logger.error("Get depth failed", e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
            case GET_BALANCE: 
                try {
                    const userId = message.data.userId;
                    const asset = message.data.asset;
                    const userBalance = this.balances.get(userId);

                    const availableBalance = userBalance?.[asset]?.available ?? 0;

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "GET_BALANCE",
                        payload: {
                            balance: String(availableBalance)
                        }
                    });
                } catch (e) {
                    logger.error("Get balance failed", e);
                }
                break;
        }
    }

    addOrderbook(orderbook: Orderbook) {
        this.orderbooks.push(orderbook);
    }

    restoreOpenOrders(openOrders: PersistedOpenOrderRow[]) {
        for (const persistedOrder of openOrders) {
            const orderbook = this.orderbooks.find((o) => o.ticker() === persistedOrder.market_symbol);
            if (!orderbook) {
                logger.warn("Skipping open-order restore for missing market", {
                    orderId: persistedOrder.id,
                    market: persistedOrder.market_symbol,
                });
                continue;
            }

            orderbook.restoreOrder({
                orderId: persistedOrder.id,
                userId: persistedOrder.user_id,
                side: persistedOrder.side,
                price: persistedOrder.price,
                quantity: persistedOrder.quantity,
                filled: persistedOrder.filled_quantity,
            });
        }
    }

    createOrder({ market, price, quantity, side, userId }: Extract<MessageToEngine, { type: typeof CREATE_ORDER }>["data"]) {
        logger.info("Create order request", {
            userId,
            market,
            side,
            price,
            quantity,
        });
        const orderbook = this.orderbooks.find(o => o.ticker() === market)
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        try {
            const order: Order = {
                price: price,
                quantity: quantity,
                orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                filled: "0",
                side,
                userId
            }

            const { fills, executedQty } = orderbook.addOrder(order);
            this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);
            // Persist the taker order before trade fills so FK-constrained trade_fills inserts succeed.
            this.updateDbOrders(order, executedQty, fills, market);
            this.createDbTrades(fills, market, userId, side, order.orderId);

            if (fills.length === 0) {
                //when no matches, new resting order
                this.publishRestingOrderUpdate(order, market);
            }

            this.publishWsTrades(fills, userId, market);
            logger.info("Create order success", {
                orderId: order.orderId,
                executedQty,
                fillCount: fills.length,
            });
            return { executedQty, fills, orderId: order.orderId };
        } catch (e) {
            // ROLLBACK: Unlock funds if something went wrong after locking
            this.unlockFunds(baseAsset, quoteAsset, side, userId, price, quantity);
            throw e;
        }
    }

    private unlockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, price: string, quantity: string) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) return;

        if (side === "buy") {
            const amount = Number(quantity) * Number(price);
            if (userBalance[quoteAsset]) {
                userBalance[quoteAsset].available += amount;
                userBalance[quoteAsset].locked -= amount;
            }
        } else {
            const amount = Number(quantity);
            if (userBalance[baseAsset]) {
                userBalance[baseAsset].available += amount;
                userBalance[baseAsset].locked -= amount;
            }
        }
    }

    createDbTrades(fills: Fill[], market: string, userId: string, side: "buy" | "sell", orderId: string) {
        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: TRADE_ADDED,
                data: {
                    market: market,
                    id: fill.tradeId.toString(),
                    isBuyerMaker: fill.otherUserId === userId,
                    price: fill.price,
                    quantity: fill.qty,
                    quoteQuantity: (Number(fill.qty) * Number(fill.price)).toString(),
                    timestamp: Date.now(),
                    makerOrderId: fill.makerOrderId,
                    takerOrderId: orderId,
                    makerUserId: fill.otherUserId,
                    takerUserId: userId,
                    buyerUserId: side === "buy" ? userId : fill.otherUserId,
                    sellerUserId: side === "sell" ? userId : fill.otherUserId
                }
            });
        });
    }

    updateDbOrders(order: Order, executedQty: string, fills: Fill[], market: string) {
        RedisManager.getInstance().pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price,
                quantity: order.quantity,
                side: order.side,
                userId: order.userId,
                status: executedQty === "0"
                    ? "open"
                    : Number(executedQty) >= Number(order.quantity)
                        ? "filled"
                        : "partially_filled",
            }
        });

        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    orderId: fill.makerOrderId,
                    executedQty: fill.qty
                }
            });
        });
    }

    publishWsTrades(fills: Fill[], userId: string, market: string) {
        fills.forEach(fill => {
            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: fill.otherUserId === userId,
                    p: fill.price,
                    q: fill.qty,
                    s: market,
                }
            });
        });
    }

    // used in cancel order
    sendUpdatedDepthAt(price: string, market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        const updatedBids = depth?.bids.filter(x => x[0] === price);
        const updatedAsks = depth?.asks.filter(x => x[0] === price);

        RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream: `depth@${market}`,
            data: {
                a: updatedAsks.length ? updatedAsks : [[price, "0"]],
                b: updatedBids.length ? updatedBids : [[price, "0"]],
                e: "depth"
            }
        });
    }

    publishRestingOrderUpdate(order: Order, market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) return;

        const depth = orderbook.getDepth();
        const priceStr = order.price;

        if (order.side === "buy") {
            const updatedBid = depth.bids.find(x => x[0] === priceStr) as [string, string]

            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: [],
                    b: [updatedBid],
                    e: "depth"
                }
            });
        } else {
            const updatedAsk = depth.asks.find(x => x[0] === priceStr) ||
                [priceStr, order.quantity];

            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: [updatedAsk],
                    b: [],
                    e: "depth"
                }
            });
        }
    }

    publishTickerPrice(market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) return;

        const tickerPrice = orderbook.tickerPrice

        RedisManager.getInstance().publishMessage(`ticker@${market}`, {
            stream: `ticker@${market}`,
            data: {
                c: tickerPrice.toString(),
                // h:"",
                // l:"",
                // v:"",
                // V:"",
                //id: 123,
                s: market,
                e: "ticker"
            }
        });
    }

    updateBalance(userId: string, baseAsset: string, quoteAsset: string, side: "buy" | "sell", fills: Fill[], executedQty: string) {
        if (side === "buy") {
            fills.forEach(fill => {
                const takerUserId = userId;
                const makerUserId = fill.otherUserId;
                const takerBalance = this.balances.get(takerUserId);
                const makerBalance = this.balances.get(makerUserId);

                if (takerBalance && makerBalance) {
                    const quoteAmount = Number(fill.qty) * Number(fill.price);
                    const baseAmount = Number(fill.qty);

                    // Update maker
                    if (makerBalance[quoteAsset]) makerBalance[quoteAsset].available += quoteAmount;
                    if (makerBalance[baseAsset]) makerBalance[baseAsset].locked -= baseAmount;

                    // Update taker
                    if (takerBalance[quoteAsset]) takerBalance[quoteAsset].locked -= quoteAmount;
                    if (takerBalance[baseAsset]) takerBalance[baseAsset].available += baseAmount;
                }
            });

        } else {
            fills.forEach(fill => {
                const takerUserId = userId;
                const makerUserId = fill.otherUserId;
                const takerBalance = this.balances.get(takerUserId);
                const makerBalance = this.balances.get(makerUserId);

                if (takerBalance && makerBalance) {
                    const quoteAmount = Number(fill.qty) * Number(fill.price);
                    const baseAmount = Number(fill.qty);

                    // Update maker
                    if (makerBalance[quoteAsset]) makerBalance[quoteAsset].locked -= quoteAmount;
                    if (makerBalance[baseAsset]) makerBalance[baseAsset].available += baseAmount;

                    // Update taker
                    if (takerBalance[quoteAsset]) takerBalance[quoteAsset].available += quoteAmount;
                    if (takerBalance[baseAsset]) takerBalance[baseAsset].locked -= baseAmount;
                }
            });
        }
    }

    checkAndLockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, asset: string, price: string, quantity: string) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            throw new Error("User balance not found");
        }

        if (side === "buy") {
            const amountRequired = Number(quantity) * Number(price);
            const balance = userBalance[quoteAsset];
            if (!balance || balance.available < amountRequired) {
                throw new Error("Insufficient funds");
            }
            balance.available -= amountRequired;
            balance.locked += amountRequired;
        } else {
            const amountRequired = Number(quantity);
            const balance = userBalance[baseAsset];
            if (!balance || balance.available < amountRequired) {
                throw new Error("Insufficient funds");
            }
            balance.available -= amountRequired;
            balance.locked += amountRequired;
        }
    }

    onRamp(userId: string, asset: string, amount: number) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: asset === BASE_CURRENCY ? amount : 0,
                    locked: 0
                },
                "BTC": {
                    available: asset === "BTC" ? amount : 0,
                    locked: 0
                },
                "SOL": {
                    available: asset === "SOL" ? amount : 0,
                    locked: 0
                },
            });
        } else {
            if (!userBalance[asset]) {
                userBalance[asset] = {
                    available: 0,
                    locked: 0
                };
            }
            userBalance[asset].available += amount;
        }
    }

    withdraw(userId: string, amount: number) {
        const userBalance = this.balances.get(userId);
        if (!userBalance || userBalance[BASE_CURRENCY].available < amount) {
            throw new Error("Insufficient funds");
        }

        userBalance[BASE_CURRENCY].available -= amount;
    }

    createUser(userId: string) {
        if (!this.balances.has(userId)) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: 0,
                    locked: 0
                },
                "BTC": {
                    available: 0,
                    locked: 0
                },
                "SOL": {
                    available: 0,
                    locked: 0
                }
            });
        }
    }

}
