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
const TOTAL_BIDS = 15;
const TOTAL_ASK = 15;
const MARKET = "BTC_USDT";
const BUY_USER_ID = "2";
const SELL_USER_ID = "5";
const PAINTER_USER_ID = "1"; // User for intentional trades

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
    if (shuttingDown) return;
    if (!isApiReady) await waitForApi();

    try {
        const targetPrice = 1000 + Math.random() * 10;
        
        // 1. Fetch all open orders in parallel
        const [openBidsRes, openAsksResponse] = await Promise.all([
            apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`),
            apiClient.get(`/api/v1/order/open?userId=${SELL_USER_ID}&market=${MARKET}`)
        ]);
        
        const openBidsData = (openBidsRes.data || []) as OpenOrder[];
        const openAsksData = (openAsksResponse.data || []) as OpenOrder[];

        logger.info("Market maker cycle start", {
            market: MARKET,
            targetPrice: targetPrice.toFixed(2),
            openBids: openBidsData.length,
            openAsks: openAsksData.length,
        });

        // 2. Parallelize cancellations
        const cancelPromises: Promise<any>[] = [];
        
        // Cancel bids too high
        openBidsData.forEach(o => {
            if (Number(o.price) > targetPrice || Math.random() < 0.3) {
                cancelPromises.push(apiClient.delete(`/api/v1/order`, { data: { orderId: o.id, market: MARKET } }));
            }
        });

        // Cancel asks too low
        openAsksData.forEach(o => {
            if (Number(o.price) < targetPrice || Math.random() < 0.3) {
                cancelPromises.push(apiClient.delete(`/api/v1/order`, { data: { orderId: o.id, market: MARKET } }));
            }
        });

        await Promise.allSettled(cancelPromises);

        // 3. Parallelize new order placement
        const orderPromises: Promise<any>[] = [];
        let bidsToAdd = TOTAL_BIDS - (openBidsData.length - cancelPromises.filter((_, i) => i < openBidsData.length).length);
        let asksToAdd = TOTAL_ASK - (openAsksData.length - cancelPromises.filter((_, i) => i >= openBidsData.length).length);

        for (let i = 0; i < bidsToAdd; i++) {
            const bidPrice = (targetPrice - Math.random() * 5).toFixed(1);
            orderPromises.push(apiClient.post(`/api/v1/order`, {
                market: MARKET, price: bidPrice, quantity: "1", side: "buy", userId: BUY_USER_ID
            }));
        }

        for (let i = 0; i < asksToAdd; i++) {
            const askPrice = (targetPrice + Math.random() * 5).toFixed(1);
            orderPromises.push(apiClient.post(`/api/v1/order`, {
                market: MARKET, price: askPrice, quantity: "1", side: "sell", userId: SELL_USER_ID
            }));
        }

        // 4. THE PAINTER LOGIC: Intentionally cross the spread to generate candles
        if (Math.random() < 0.7) { // 70% chance to paint every cycle
            const side = Math.random() > 0.5 ? "buy" : "sell";
            const paintPrice = side === "buy" ? (targetPrice + 0.1).toFixed(1) : (targetPrice - 0.1).toFixed(1);
            
            logger.info("🎨 Painting chart trade", { side, price: paintPrice });
            orderPromises.push(apiClient.post(`/api/v1/order`, {
                market: MARKET,
                price: paintPrice,
                quantity: "1",
                side: side,
                userId: PAINTER_USER_ID
            }));
        }

        await Promise.allSettled(orderPromises);
        logger.info("Market maker cycle complete", { placed: orderPromises.length, cancelled: cancelPromises.length });

    } catch (error) {
        logger.error("Market maker cycle failed", error);
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Fast cycles: 500ms
    main();
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
    res.end(JSON.stringify({ status: statusCode === 200 ? "ok" : "error", service: "market-maker" }));
});

healthServer.listen(healthPort, () => {
    logger.info("Market maker health server listening", { port: healthPort });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        shuttingDown = true;
        logger.info("Shutting down market maker", { signal });
        healthServer.closeAllConnections?.();
        healthServer.close(() => process.exit(0));
    });
}

main().catch((error) => {
    logger.error("Market maker fatal failure", error);
    process.exit(1);
});
