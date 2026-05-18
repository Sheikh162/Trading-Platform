import { RedisManager } from "../RedisManager";
import { Fill, OpenOrder as Order } from "@trading-platform/shared-types";
import { BASE_CURRENCY } from "./Engine";

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    tickerPrice: number; //this is frontend ticker

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.tickerPrice = currentPrice || 0;
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getOrderbookDetailsForSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.tickerPrice
        }
    }

    restoreOrder(order: Order) {
        if (order.side === "buy") {
            this.insertBid(order);
            return;
        }

        this.insertAsk(order);
    }

    addOrder(order: Order): { executedQty: string, fills: Fill[] } {
        if (order.side === "buy") {
            const { executedQty, fills } = this.matchBid(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return {
                    executedQty,
                    fills
                }
            }

            this.insertBid(order);
            return {
                executedQty,
                fills
            }
        } else {
            const { executedQty, fills } = this.matchAsk(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return {
                    executedQty,
                    fills
                }
            }
            this.insertAsk(order);
            return {
                executedQty,
                fills
            }
        }
    }

    matchBid(order: Order): { fills: Fill[], executedQty: string } {
        const fills: Fill[] = [];
        let executedQty = 0;
        const priceLevelChanges = new Map<string, number>();

        for (let i = 0; i < this.asks.length; i++) {
            const ask = this.asks[i];
            const askPriceNum = Number(ask.price);
            const orderPriceNum = Number(order.price);
            if (ask.userId !== order.userId && askPriceNum <= orderPriceNum) {
                const fillableQty = Math.min(Number(order.quantity) - executedQty, Number(ask.quantity) - Number(ask.filled));
                if (fillableQty <= 0) continue;

                executedQty += fillableQty;
                ask.filled = (Number(ask.filled) + fillableQty).toString();

                const current = priceLevelChanges.get(ask.price) || 0;
                priceLevelChanges.set(ask.price, current - fillableQty);

                fills.push({
                    price: ask.price,
                    qty: fillableQty.toString(),
                    tradeId: this.lastTradeId++,
                    otherUserId: ask.userId,
                    makerOrderId: ask.orderId
                });

                this.tickerPrice = parseFloat(fills[fills.length - 1].price);
                this.publishTickerPrice()
                if (executedQty >= Number(order.quantity)) break;
            }
        }

        const affectedAsks: [string, string][] = [];
        priceLevelChanges.forEach((netChange, price) => {
            const currentDepthQty = this.asks
                .filter(a => a.price === price && Number(a.filled) < Number(a.quantity))
                .reduce((sum, a) => sum + (Number(a.quantity) - Number(a.filled)), 0);

            affectedAsks.push([price, currentDepthQty.toString()]);
        });

        if (affectedAsks.length > 0) {
            RedisManager.getInstance().publishMessage(`depth@${this.ticker()}`, {
                stream: `depth@${this.ticker()}`,
                data: {
                    a: affectedAsks,
                    b: Number(order.quantity) > executedQty
                        ? [[order.price, (Number(order.quantity) - executedQty).toString()]]
                        : [],
                    e: "depth"
                }
            });
        }

        this.asks = this.asks.filter(ask => Number(ask.filled) < Number(ask.quantity));
        return { fills, executedQty: executedQty.toString() };
    }

    matchAsk(order: Order): { fills: Fill[], executedQty: string } {
        const fills: Fill[] = [];
        let executedQty = 0;
        const priceLevelChanges = new Map<string, number>();

        for (let i = 0; i < this.bids.length; i++) {
            const bid = this.bids[i];
            const bidPriceNum = Number(bid.price);
            const orderPriceNum = Number(order.price);
            if (bid.userId !== order.userId && bidPriceNum >= orderPriceNum) {
                const fillableQty = Math.min(Number(order.quantity) - executedQty, Number(bid.quantity) - Number(bid.filled));
                if (fillableQty <= 0) continue;

                executedQty += fillableQty;
                bid.filled = (Number(bid.filled) + fillableQty).toString();

                const current = priceLevelChanges.get(bid.price) || 0;
                priceLevelChanges.set(bid.price, current - fillableQty);

                fills.push({
                    price: bid.price,
                    qty: fillableQty.toString(),
                    tradeId: this.lastTradeId++,
                    otherUserId: bid.userId,
                    makerOrderId: bid.orderId
                });

                this.tickerPrice = parseFloat(fills[fills.length - 1].price);
                this.publishTickerPrice()

                if (executedQty >= Number(order.quantity)) break;
            }
        }

        const affectedBids: [string, string][] = [];
        priceLevelChanges.forEach((netChange, price) => {
            const currentDepthQty = this.bids
                .filter(b => b.price === price && Number(b.filled) < Number(b.quantity))
                .reduce((sum, b) => sum + (Number(b.quantity) - Number(b.filled)), 0);

            affectedBids.push([price, currentDepthQty.toString()]);
        });

        if (affectedBids.length > 0) {
            RedisManager.getInstance().publishMessage(`depth@${this.ticker()}`, {
                stream: `depth@${this.ticker()}`,
                data: {
                    a: Number(order.quantity) > executedQty
                        ? [[order.price, (Number(order.quantity) - executedQty).toString()]]
                        : [],
                    b: affectedBids,
                    e: "depth"
                }
            });
        }

        this.bids = this.bids.filter(bid => Number(bid.filled) < Number(bid.quantity));
        return { fills, executedQty: executedQty.toString() };
    }

    publishTickerPrice() {
        const tickerPrice = this.tickerPrice
        const market = this.ticker()
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

    getDepth() {
        const bids: [string, string][] = [];
        const asks: [string, string][] = [];

        //using map specifically maintain insertion order
        const bidsMap = new Map<string, number>();
        const asksMap = new Map<string, number>();

        for (let i = 0; i < this.bids.length; i++) {
            const order = this.bids[i];
            const currentQty = bidsMap.get(order.price) || 0;
            if (Number(order.quantity) > Number(order.filled)) {
                bidsMap.set(order.price, currentQty + (Number(order.quantity) - Number(order.filled)));
            }
        }

        for (let i = 0; i < this.asks.length; i++) {
            const order = this.asks[i];
            const currentQty = asksMap.get(order.price) || 0;
            if (Number(order.quantity) > Number(order.filled)) {
                asksMap.set(order.price, currentQty + (Number(order.quantity) - Number(order.filled)));
            }
        }

        //convert map to array
        bidsMap.forEach((value, price) => {
            bids.push([price, value.toString()]);
        });

        asksMap.forEach((value, price) => {
            asks.push([price, value.toString()]);
        });

        return {
            bids,
            asks
        };
    }

    getOpenOrders(userId: string): Order[] {
        const asks = this.asks.filter(x => x.userId === userId);
        const bids = this.bids.filter(x => x.userId === userId);
        return [...asks, ...bids];
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const price = this.bids[index].price;
            this.bids.splice(index, 1);
            return price
        }
    }

    cancelAsk(order: Order) {
        const index = this.asks.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const price = this.asks[index].price;
            this.asks.splice(index, 1);
            return price
        }
    }

    private insertBid(order: Order) {
        const orderPriceNum = Number(order.price);
        if (this.bids.length === 0 || orderPriceNum <= Number(this.bids[this.bids.length - 1].price)) {
            this.bids.push(order);
            return;
        }

        for (let i = 0; i < this.bids.length; i++) {
            if (orderPriceNum > Number(this.bids[i].price)) {
                this.bids.splice(i, 0, order);
                return;
            }
        }
    }

    private insertAsk(order: Order) {
        const orderPriceNum = Number(order.price);
        if (this.asks.length === 0 || orderPriceNum >= Number(this.asks[this.asks.length - 1].price)) {
            this.asks.push(order);
            return;
        }

        for (let i = 0; i < this.asks.length; i++) {
            if (orderPriceNum < Number(this.asks[i].price)) {
                this.asks.splice(i, 0, order);
                return;
            }
        }
    }

}
