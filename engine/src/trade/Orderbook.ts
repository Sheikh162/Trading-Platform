import { RedisManager } from "../RedisManager";
import { BASE_CURRENCY } from "./Engine";


export interface Order {
    price: number;
    quantity: number;
    orderId: string;
    filled: number;
    side: "buy" | "sell";
    userId: string;
}

export interface Fill {
    price: string;
    qty: number;
    tradeId: number;
    otherUserId: string;
    markerOrderId: string;
}

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    tickerPrice: number; // this is frontend ticker

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.tickerPrice = currentPrice ||0;
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

    addOrder(order: Order): {executedQty: number,fills: Fill[]} {
        if (order.side === "buy") {
            const {executedQty, fills} = this.matchBid(order); 
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return {
                    executedQty,
                    fills
                }
            }// changes needed here to priority of orders i.e bid price high means beginning of array i.e insert beg, if <= then push,  heap top 15 logic could also be valid
    
            if (this.bids.length==0 || order.price<=this.bids[this.bids.length-1].price) this.bids.push(order);
            else{
                for(let i=0;i<this.bids.length;i++){ // try to find a faster way because tc is O(bids.length, which keeps changing)
                    if(order.price>this.bids[i].price){
                        //console.log
                        this.bids.splice(i,0,order)
                        //console.log(this.bids)
                        break
                    }
                }
            }
            return {
                executedQty,
                fills
            }
        } else {
            const {executedQty, fills} = this.matchAsk(order);
            order.filled = executedQty;
            if (executedQty === order.quantity) {
                return {
                    executedQty,
                    fills
                }
            }
            if (this.asks.length==0 || order.price>=this.asks[this.asks.length-1].price) this.asks.push(order);
            else{// some issue here

                for(let i=0;i<this.asks.length;i++){ // try to find a faster way because tc is O(bids.length, which keeps changing)
                    if(order.price<this.asks[i].price){
                        this.asks.splice(i,0,order)
                        break
                    }
                }
            }
            return {
                executedQty,
                fills
            }
        }
    }

    matchBid(order: Order): {fills: Fill[], executedQty: number} {
        const fills: Fill[] = [];
        let executedQty = 0;
        const priceLevelChanges = new Map<string, number>(); // Tracks NET changes per price
    
        for (let i = 0; i < this.asks.length; i++) {
            const ask = this.asks[i];
            if (ask.userId !== order.userId && ask.price <= order.price) {
                const fillableQty = Math.min(order.quantity - executedQty, ask.quantity - ask.filled);
                if (fillableQty <= 0) continue;
    
                executedQty += fillableQty;
                ask.filled += fillableQty;
    
                // Track NET change per price level
                const current = priceLevelChanges.get(ask.price.toString()) || 0;
                priceLevelChanges.set(ask.price.toString(), current - fillableQty);
    
                fills.push({
                    price: ask.price.toString(),
                    qty: fillableQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: ask.userId,
                    markerOrderId: ask.orderId
                });

                this.tickerPrice = parseFloat(fills[fills.length - 1].price);
                this.publishTickerPrice()
                if (executedQty >= order.quantity) break;
            }
        }
    
        // Generate accurate depth updates
        const affectedAsks: [string, string][] = [];
        priceLevelChanges.forEach((netChange, price) => {
            const currentDepthQty = this.asks
                .filter(a => a.price.toString() === price && a.filled < a.quantity)
                .reduce((sum, a) => sum + (a.quantity - a.filled), 0);
            
            affectedAsks.push([price, currentDepthQty.toString()]);
        });
    
        if (affectedAsks.length > 0) {
            RedisManager.getInstance().publishMessage(`depth@${this.ticker()}`, {
                stream: `depth@${this.ticker()}`,
                data: {
                    a: affectedAsks,
                    b: order.quantity > executedQty 
                        ? [[order.price.toString(), (order.quantity - executedQty).toString()]]
                        : [],
                    e: "depth"
                }
            });
        }
    
        this.asks = this.asks.filter(ask => ask.filled < ask.quantity);
        return { fills, executedQty };
    }

    matchAsk(order: Order): {fills: Fill[], executedQty: number} {
        const fills: Fill[] = [];
        let executedQty = 0;
        const priceLevelChanges = new Map<string, number>(); // Tracks NET changes per price
    
        for (let i = 0; i < this.bids.length; i++) {
            const bid = this.bids[i];
            if (bid.userId !== order.userId && bid.price >= order.price) {
                const fillableQty = Math.min(order.quantity - executedQty, bid.quantity - bid.filled);
                if (fillableQty <= 0) continue;
    
                executedQty += fillableQty;
                bid.filled += fillableQty;
    
                // Track NET change per price level
                const current = priceLevelChanges.get(bid.price.toString()) || 0;
                priceLevelChanges.set(bid.price.toString(), current - fillableQty);
    
                fills.push({
                    price: bid.price.toString(),
                    qty: fillableQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: bid.userId,
                    markerOrderId: bid.orderId
                });

                this.tickerPrice = parseFloat(fills[fills.length - 1].price);
                this.publishTickerPrice()

                if (executedQty >= order.quantity) break;
            }
        }
    
        // Generate accurate depth updates
        const affectedBids: [string, string][] = [];
        priceLevelChanges.forEach((netChange, price) => {
            const currentDepthQty = this.bids
                .filter(b => b.price.toString() === price && b.filled < b.quantity)
                .reduce((sum, b) => sum + (b.quantity - b.filled), 0);
            
            affectedBids.push([price, currentDepthQty.toString()]);
        });
    
        if (affectedBids.length > 0) {
            RedisManager.getInstance().publishMessage(`depth@${this.ticker()}`, {
                stream: `depth@${this.ticker()}`,
                data: {
                    a: order.quantity > executedQty 
                        ? [[order.price.toString(), (order.quantity - executedQty).toString()]]
                        : [],
                    b: affectedBids,
                    e: "depth"
                }
            });
        }
    
        this.bids = this.bids.filter(bid => bid.filled < bid.quantity);
        return { fills, executedQty };
    }

    publishTickerPrice() {    
        const tickerPrice=this.tickerPrice
        const market=this.ticker()
        RedisManager.getInstance().publishMessage(`ticker@${market}`, {
            stream: `ticker@${market}`,
            data: {
                c: tickerPrice.toString(), // No ask updates
/*                 h:"",
                l:"",
                v:"",
                V:"", */
                s:market,
                //id: 123,
                e: "ticker"
            }
        });
    }

    getDepth() {
            const bids: [string, string][] = [];
            const asks: [string, string][] = [];
        
            // Use Map to maintain insertion order
            const bidsMap = new Map<number, number>();
            const asksMap = new Map<number, number>();
        
            for (let i = 0; i < this.bids.length; i++) {
                const order = this.bids[i];
                const currentQty = bidsMap.get(order.price) || 0;
                if (order.quantity > order.filled) {
                    bidsMap.set(order.price, currentQty + (order.quantity - order.filled));
                }
            }
        
            for (let i = 0; i < this.asks.length; i++) {
                const order = this.asks[i];
                const currentQty = asksMap.get(order.price) || 0;
                if (order.quantity > order.filled) {
                    asksMap.set(order.price, currentQty + (order.quantity - order.filled));
                }
            }
        
            // Convert Map to array - order will be preserved
            bidsMap.forEach((value, price) => {
                bids.push([price.toString(), value.toString()]);
            });
        
            asksMap.forEach((value, price) => {
                asks.push([price.toString(), value.toString()]);
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

}
