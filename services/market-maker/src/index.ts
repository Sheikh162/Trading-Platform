import "dotenv/config"; 
import { createLogger } from "@trading-platform/logger";
import http from "node:http";
import axios from "axios";

const logger = createLogger("market-maker");

type OpenOrder = {
    id: string;
    side: "buy" | "sell";
    price: string;
};

type PlaceOrderResponse = {
    orderId?: string;
};

const BASE_URL = process.env.API_BASE_URL;
const TOTAL_BIDS = 30;
const TOTAL_ASK = 30;
const MARKET = "BTC_USDT";
const BUY_USER_ID = "2";
const SELL_USER_ID = "5";
let isApiReady = false;
let shuttingDown = false;

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "x-admin-secret": process.env.ADMIN_SECRET
    }
})

async function waitForApi() {
  while (!shuttingDown) {
    try {
      //await axios.get(`${BASE_URL}/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`)
      await apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`)
      isApiReady = true;
      logger.info("API is reachable");
      break;
    } catch (e) {
      logger.warn("API not ready, retrying");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
    if (shuttingDown) {
        return;
    }
    if(!isApiReady) await waitForApi();
    const price = 1000 + Math.random() * 10;
    
    // Fetch open orders for BOTH bots independently so it doesn't leak memory or hallucinate empty asks
    const openBidsResponse = await apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`);
    const openAsksResponse = await apiClient.get(`/api/v1/order/open?userId=${SELL_USER_ID}&market=${MARKET}`);
    
    const openBidsData = (openBidsResponse.data || []) as OpenOrder[];
    const openAsksData = (openAsksResponse.data || []) as OpenOrder[];

    if (!Array.isArray(openBidsData) || !Array.isArray(openAsksData)) {
        logger.error("Failed to fetch valid open orders", { baseUrl: BASE_URL });
        await new Promise(resolve => setTimeout(resolve, 2000));
        return main();
    }

    const totalBids = openBidsData.length;
    const totalAsks = openAsksData.length;

    logger.info("Market maker cycle start", {
        market: MARKET,
        targetPrice: price.toFixed(2),
        openBids: totalBids,
        openAsks: totalAsks,
    });

    const cancelledBids = await cancelBidsMoreThan(openBidsData, price);
    const cancelledAsks = await cancelAsksLessThan(openAsksData, price);
    
    let bidsToAdd = TOTAL_BIDS - (totalBids - cancelledBids);
    let asksToAdd = TOTAL_ASK - (totalAsks - cancelledAsks);

    logger.info("Market maker cycle summary", {
        cancelledBids,
        cancelledAsks,
        bidsToAdd,
        asksToAdd,
    });

    while(bidsToAdd > 0 || asksToAdd > 0) {
        if (bidsToAdd > 0) {
            const bidPrice = (price - Math.random() * 1).toFixed(1).toString();
            const response = await apiClient.post<PlaceOrderResponse>(`/api/v1/order`, {
                market: MARKET,
                price: bidPrice,
                quantity: "1",
                side: "buy",
                userId: BUY_USER_ID
            });
            logger.info("Placed buy order", {
                userId: BUY_USER_ID,
                price: bidPrice,
                orderId: response.data?.orderId ?? "unknown",
            });
            bidsToAdd--;
        }
        if (asksToAdd > 0) {
            const askPrice = (price + Math.random() * 1).toFixed(1).toString();
            const response = await apiClient.post<PlaceOrderResponse>(`/api/v1/order`, {
                market: MARKET,
                price: askPrice,
                quantity: "1",
                side: "sell",
                userId: SELL_USER_ID
            });
            logger.info("Placed sell order", {
                userId: SELL_USER_ID,
                price: askPrice,
                orderId: response.data?.orderId ?? "unknown",
            });
            asksToAdd--;
        }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    main();
}

async function cancelBidsMoreThan(openOrders: OpenOrder[], price: number) {
    const promises: Promise<unknown>[] = [];
    openOrders.forEach((o) => {
        if (!o?.id) {
            logger.warn("Skipping malformed buy order payload", o);
            return;
        }
        if (o.side === "buy" && (Number(o.price) > price || Math.random() < 0.5)) {
            logger.info("Cancelling buy order", { orderId: o.id, price: o.price });
            promises.push(apiClient.delete(`/api/v1/order`, {
                data: {
                    orderId: o.id,
                    market: MARKET
                }
            }).catch(e => {
                // Ignore errors from cancellations (likely already filled/removed)
                logger.debug("Failed to cancel buy order", { id: o.id });
            }));
        }
    });
    await Promise.all(promises);
    return promises.length;
}

async function cancelAsksLessThan(openOrders: OpenOrder[], price: number) {
    const promises: Promise<unknown>[] = [];
    openOrders.forEach((o) => {
        if (!o?.id) {
            logger.warn("Skipping malformed sell order payload", o);
            return;
        }
        if (o.side === "sell" && (Number(o.price) < price || Math.random() < 0.5)) {
            logger.info("Cancelling sell order", { orderId: o.id, price: o.price });
            promises.push(apiClient.delete(`/api/v1/order`, {
                data: {
                    orderId: o.id,
                    market: MARKET
                }
            }).catch(e => {
                // Ignore errors from cancellations (likely already filled/removed)
                logger.debug("Failed to cancel buy order", { id: o.id });
            }));
        }
    });

    await Promise.all(promises);
    return promises.length;
}

const healthPort = Number(process.env.HEALTH_PORT || 8085);
const healthServer = http.createServer((req, res) => {
    if (req.url !== "/healthz" && req.url !== "/readyz") {
        res.writeHead(404);
        res.end();
        return;
    }

    const statusCode = isApiReady && !shuttingDown ? 200 : 503;
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify({
        status: statusCode === 200 ? "ok" : "error",
        service: "market-maker",
    }));
});

healthServer.listen(healthPort, () => {
    logger.info("Market maker health server listening", { port: healthPort });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        shuttingDown = true;
        logger.info("Shutting down market maker", { signal });
        healthServer.closeAllConnections?.();
        healthServer.close(() => {
            process.exit(0);
        });
    });
}

main().catch((error) => {
    logger.error("Market maker failed", error);
    process.exit(1);
});

//     try {
//         // Add a small random jitter so Open != Close
//         // This ensures the candle has a tiny "body" instead of being a flat line
//         const jitter = (Math.random() - 0.5) * 2; // Random swing between -1 and +1 dollar
//         const executionPrice = (currentPrice + jitter).toFixed(2);

//         // We still cross the spread to ensure fill, but we log the 'jittered' price
//         // Note: In a real matching engine, the execution price is determined by the Maker order.
//         // To make the chart look "wiggly", we need the Liquidity Walls to move slightly too.
        
//         // For now, simply forcing the trade more often will fill the chart.
//         const aggressivePrice = (currentPrice * (1 + SPREAD + 0.001)).toFixed(2);

//         await apiClient.post(`/api/v1/order`, {
//             market: MARKET,
//             price: aggressivePrice, 
//             quantity: "1",
//             side: "buy",
//             userId: PAINTER_USER_ID, 
//         });
        
//         lastPaintedPrice = currentPrice;
//         console.log(`🎨 Chart Painted!`);
//     } catch (e) {
//         console.log("Paint failed", e);
//     }
// }

// // Add this helper function to mm/src/index.ts

// function testBinanceConnection(): Promise<void> {
//     return new Promise((resolve, reject) => {
//         console.log("🔍 Testing Binance Connection...");
        
//         const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
//         let messageCount = 0;

//         ws.on('open', () => {
//             console.log('✅ Connected to Binance WebSocket!');
//         });

//         ws.on('message', (data: any) => {
//             const trade = JSON.parse(data.toString());
//             const price = parseFloat(trade.p).toFixed(2);
//             const time = new Date(trade.T).toLocaleTimeString();
            
//             console.log(`[Stream Test] BTC Price: $${price} at ${time}`);
            
//             messageCount++;
            
//             // Stop testing after 5 messages so we can proceed
//             if (messageCount >= 5) {
//                 console.log("✅ Stream is working perfectly. Starting Bot...");
//                 ws.terminate(); // Close this test connection
//                 resolve();
//             }
//         });

//         ws.on('error', (err) => {
//             console.error('❌ WebSocket Error:', err);
//             reject(err);
//         });
//     });
// }

// async function main() {
//     connectToBinance();
//     setInterval(syncLiquidity, 1000); 
//     setInterval(paintChart, PAINTER_INTERVAL);
// }

// main();
