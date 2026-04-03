import fs from "fs";
import { Client } from "pg";
import { RedisManager } from "../RedisManager";
import { ORDER_UPDATE, TRADE_ADDED } from "../types/index";
import { CANCEL_ORDER, CREATE_ORDER, GET_BALANCE, GET_DEPTH, GET_OPEN_ORDERS, MessageFromApi, ON_RAMP, USER_CREATED, WITHDRAW } from "../types/fromApi";
import { Fill, Order, Orderbook } from "./Orderbook";

export const BASE_CURRENCY = "USDT";

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

    constructor() {
        let snapshot = null  // snapshot is a JSON which consists of orderbooks(array of orderbook), and balances(array of balance of each user)
        const withSnapshot = process.env.WITH_SNAPSHOT === "true";
        const snapshotFile = process.env.SNAPSHOT_FILE || "./snapshot.json";

        try {
            if (withSnapshot && fs.existsSync(snapshotFile)) {
                snapshot = fs.readFileSync(snapshotFile);
                console.log(`Loaded snapshot from ${snapshotFile}`);
            }
        } catch (e) {
            console.log("No snapshot found");
        }

        if (snapshot) {
            const parsedSnapshot = JSON.parse(snapshot.toString()); //  snapshot type is buffer, thats why we are stringifyng it and parsing it again
            this.orderbooks = parsedSnapshot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(parsedSnapshot.balances);
            console.log(this.orderbooks)
            console.log(this.balances)
        } else {
            this.orderbooks = [new Orderbook(`BTC`, [], [], 0, 0)];
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 5);
    }

    async hydrateFromDb() {
        const client = new Client({
            user: process.env.POSTGRES_USER,
            host: process.env.POSTGRES_HOST,
            database: process.env.POSTGRES_DB,
            password: process.env.POSTGRES_PASSWORD,
            port: Number(process.env.POSTGRES_PORT),
        });

        await client.connect();
        try {
            const [marketsResult, balancesResult, openOrdersResult] = await Promise.all([
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
            ]);

            const marketSymbols = marketsResult.rows.map((row: { symbol: string }) => row.symbol);
            const existing = new Set(this.orderbooks.map((orderbook) => orderbook.ticker()));

            if (this.orderbooks.length === 1 && this.orderbooks[0]?.ticker() === "BTC_USDT" && marketSymbols.includes("BTC_USDT")) {
                existing.add("BTC_USDT");
            }

            for (const symbol of marketSymbols) {
                if (!existing.has(symbol)) {
                    const [baseAsset] = symbol.split("_");
                    this.orderbooks.push(new Orderbook(baseAsset, [], [], 0, 0));
                }
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
            console.log(`Hydrated ${this.balances.size} users from PostgreSQL`);
            console.log(`Hydrated ${marketSymbols.length} markets from PostgreSQL`);
            if (openOrdersResult.rows.length > 0) {
                console.log(`[engine] Restored ${openOrdersResult.rows.length} open orders from PostgreSQL into the in-memory orderbook`);
            } else {
                console.log("[engine] No open orders found in PostgreSQL at startup");
            }
        } finally {
            await client.end();
        }
    }

    saveSnapshot() {
        const toSnapshot = {
            orderbooks: this.orderbooks.map(o => o.getOrderbookDetailsForSnapshot()),
            balances: Array.from(this.balances.entries())
        }
        fs.writeFileSync("./snapshot.json", JSON.stringify(toSnapshot));// while writing stringify, while reading parse(.tostring), since buffer while reading
    }

    process({ message, clientId }: { message: MessageFromApi, clientId: string }) {
        switch (message.type) {
            case USER_CREATED:
                this.createUser(message.data.userId);
                console.log(this.balances)
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
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
            case CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const cancelMarket = message.data.market;
                    const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket); // finding orderbook in which order to cancel
                    const quoteAsset = cancelMarket.split("_")[1];
                    if (!cancelOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    //finding order from asks, bids from the orderbook
                    const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);
                    if (!order) {
                        console.log(`[engine] cancel miss orderId=${orderId} market=${cancelMarket} inMemoryBids=${cancelOrderbook.bids.length} inMemoryAsks=${cancelOrderbook.asks.length}`);
                        console.log("[engine] top in-memory bid ids:", cancelOrderbook.bids.slice(0, 5).map(o => o.orderId));
                        console.log("[engine] top in-memory ask ids:", cancelOrderbook.asks.slice(0, 5).map(o => o.orderId));
                        console.log("No order found");
                        throw new Error("No order found");
                    }

                    if (order.side === "buy") {
                        const price = cancelOrderbook.cancelBid(order) // when order cancelled, refund has to be done
                        const leftQuantity = (order.quantity - order.filled) * order.price;
                        // subtracted since filled i.e executed qty cant be considered while cancelling
                        //@ts-ignore
                        this.balances.get(order.userId)[BASE_CURRENCY].available += leftQuantity;//refund ig
                        //@ts-ignore
                        this.balances.get(order.userId)[BASE_CURRENCY].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    } else {
                        const price = cancelOrderbook.cancelAsk(order)
                        const leftQuantity = order.quantity - order.filled;
                        //@ts-ignore
                        this.balances.get(order.userId)[quoteAsset].available += leftQuantity;
                        //@ts-ignore
                        this.balances.get(order.userId)[quoteAsset].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: 0,
                            remainingQty: 0
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
                    console.log("Error hwile cancelling order",);
                    console.log(e);
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
                    console.log(e);
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const amount = Number(message.data.amount);
                this.onRamp(userId, amount);
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
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
            case GET_BALANCE: // need to fix this, why does this not return the money? it is in memory
                try {
                    const userId = message.data.userId;
                    console.log(userId)
                    const userBalance = this.balances.get(userId);

                    // Safely access the available balance of the BASE_CURRENCY (e.g., "INR").
                    // It defaults to 0 if the user or their INR balance doesn't exist.
                    const availableMoney = userBalance?.[BASE_CURRENCY]?.available ?? 0;

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "GET_BALANCE",
                        payload: {
                            balance: String(availableMoney) // Now sends only the number
                        }
                    });
                } catch (e) {
                    console.log(e);
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
                console.log(`[engine] skipping restore for orderId=${persistedOrder.id} missing market=${persistedOrder.market_symbol}`);
                continue;
            }

            orderbook.restoreOrder({
                orderId: persistedOrder.id,
                userId: persistedOrder.user_id,
                side: persistedOrder.side,
                price: Number(persistedOrder.price),
                quantity: Number(persistedOrder.quantity),
                filled: Number(persistedOrder.filled_quantity),
            });
        }
    }

    createOrder({ market, price, quantity, side, userId }: Extract<MessageFromApi, { type: typeof CREATE_ORDER }>["data"]) {
        console.log(`[engine] createOrder request user=${userId} market=${market} side=${side} price=${price} quantity=${quantity}`);
        const orderbook = this.orderbooks.find(o => o.ticker() === market)
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        }

        const { fills, executedQty } = orderbook.addOrder(order);
        this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);
        // Persist the taker order before trade fills so FK-constrained trade_fills inserts succeed.
        this.updateDbOrders(order, executedQty, fills, market);
        this.createDbTrades(fills, market, userId, side, order.orderId);
        //this.publishWsDepthUpdates(fills, price, side, market);  implement later

        if (fills.length > 0) {
            //if matches occurred, handled by redis in matchBid, matchAsk in orderbook file
        } else {
            //when no matches, new resting order
            this.publishRestingOrderUpdate(order, market);
        }

        this.publishWsTrades(fills, userId, market);
        console.log(`[engine] createOrder success orderId=${order.orderId} executedQty=${executedQty} fills=${fills.length}`);
        return { executedQty, fills, orderId: order.orderId };
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
                    quantity: fill.qty.toString(),// this pushes volume also
                    quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                    timestamp: Date.now(),
                    makerOrderId: fill.markerOrderId,
                    takerOrderId: orderId,
                    makerUserId: fill.otherUserId,
                    takerUserId: userId,
                    buyerUserId: side === "buy" ? userId : fill.otherUserId,
                    sellerUserId: side === "sell" ? userId : fill.otherUserId
                }
            });
        });
    }

    updateDbOrders(order: Order, executedQty: number, fills: Fill[], market: string) {
        RedisManager.getInstance().pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side,
                userId: order.userId,
                status: executedQty === 0
                    ? "open"
                    : executedQty >= order.quantity
                        ? "filled"
                        : "partially_filled",
            }
        });

        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    orderId: fill.markerOrderId,
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
                    q: fill.qty.toString(),
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
        const priceStr = order.price.toString();

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
                [priceStr, order.quantity.toString()];

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
    // similar to the above, make for currentprice i.e ticker price

    updateBalance(userId: string, baseAsset: string, quoteAsset: string, side: "buy" | "sell", fills: Fill[], executedQty: number) {
        if (side === "buy") {
            fills.forEach(fill => {
                // Update quote asset balance
                //@ts-ignore
                this.balances.get(fill.otherUserId)[quoteAsset].available = this.balances.get(fill.otherUserId)?.[quoteAsset].available + (fill.qty * fill.price);

                //@ts-ignore
                this.balances.get(userId)[quoteAsset].locked = this.balances.get(userId)?.[quoteAsset].locked - (fill.qty * fill.price);

                // Update base asset balance

                //@ts-ignore
                this.balances.get(fill.otherUserId)[baseAsset].locked = this.balances.get(fill.otherUserId)?.[baseAsset].locked - fill.qty;

                //@ts-ignore
                this.balances.get(userId)[baseAsset].available = this.balances.get(userId)?.[baseAsset].available + fill.qty;

            });

        } else {
            fills.forEach(fill => {
                // Update quote asset balance
                //@ts-ignore
                this.balances.get(fill.otherUserId)[quoteAsset].locked = this.balances.get(fill.otherUserId)?.[quoteAsset].locked - (fill.qty * fill.price);

                //@ts-ignore
                this.balances.get(userId)[quoteAsset].available = this.balances.get(userId)?.[quoteAsset].available + (fill.qty * fill.price);

                // Update base asset balance

                //@ts-ignore
                this.balances.get(fill.otherUserId)[baseAsset].available = this.balances.get(fill.otherUserId)?.[baseAsset].available + fill.qty;

                //@ts-ignore
                this.balances.get(userId)[baseAsset].locked = this.balances.get(userId)?.[baseAsset].locked - (fill.qty);

            });
        }
    }

    checkAndLockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, asset: string, price: string, quantity: string) {
        if (side === "buy") {
            if ((this.balances.get(userId)?.[quoteAsset]?.available || 0) < Number(quantity) * Number(price)) { // price here is per unit stock
                throw new Error("Insufficient funds");
            }
            //@ts-ignore
            this.balances.get(userId)[quoteAsset].available = this.balances.get(userId)?.[quoteAsset].available - (Number(quantity) * Number(price));

            //@ts-ignore
            this.balances.get(userId)[quoteAsset].locked = this.balances.get(userId)?.[quoteAsset].locked + (Number(quantity) * Number(price));
        } else {
            if ((this.balances.get(userId)?.[baseAsset]?.available || 0) < Number(quantity)) {
                throw new Error("Insufficient funds");
            }
            //@ts-ignore
            this.balances.get(userId)[baseAsset].available = this.balances.get(userId)?.[baseAsset].available - (Number(quantity));

            //@ts-ignore
            this.balances.get(userId)[baseAsset].locked = this.balances.get(userId)?.[baseAsset].locked + Number(quantity);
        }
    }

    onRamp(userId: string, amount: number) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: amount,
                    locked: 0
                },
                "BTC": {
                    available: 0,
                    locked: 0
                },
                "SOL": {
                    available: 0,
                    locked: 0
                },
            });
        } else {
            if (!userBalance[BASE_CURRENCY]) {
                userBalance[BASE_CURRENCY] = {
                    available: 0,
                    locked: 0
                };
            }
            userBalance[BASE_CURRENCY].available += amount;
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
