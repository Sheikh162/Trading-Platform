import "dotenv/config"; 
import axios from "axios";

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

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "x-admin-secret": process.env.ADMIN_SECRET
    }
})

async function waitForApi() {
  while (true) {
    try {
      //await axios.get(`${BASE_URL}/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`)
      await apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`)
      isApiReady = true;
      console.log("API is up!");
      break;
    } catch (e) {
      console.log("API not ready, retrying...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
    if(!isApiReady) await waitForApi();
    const price = 1000 + Math.random() * 10;
    
    // Fetch open orders for BOTH bots independently so it doesn't leak memory or hallucinate empty asks
    const openBidsResponse = await apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`);
    const openAsksResponse = await apiClient.get(`/api/v1/order/open?userId=${SELL_USER_ID}&market=${MARKET}`);
    
    const openBidsData = (openBidsResponse.data || []) as OpenOrder[];
    const openAsksData = (openAsksResponse.data || []) as OpenOrder[];

    if (!Array.isArray(openBidsData) || !Array.isArray(openAsksData)) {
        console.error("Failed to fetch valid open orders. Check if API is running at", BASE_URL);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return main();
    }

    const totalBids = openBidsData.length;
    const totalAsks = openAsksData.length;

    console.log(`[mm] cycle start market=${MARKET} targetPrice=${price.toFixed(2)} openBids=${totalBids} openAsks=${totalAsks}`);

    const cancelledBids = await cancelBidsMoreThan(openBidsData, price);
    const cancelledAsks = await cancelAsksLessThan(openAsksData, price);
    
    let bidsToAdd = TOTAL_BIDS - (totalBids - cancelledBids);
    let asksToAdd = TOTAL_ASK - (totalAsks - cancelledAsks);

    console.log(`[mm] cycle summary cancelledBids=${cancelledBids} cancelledAsks=${cancelledAsks} bidsToAdd=${bidsToAdd} asksToAdd=${asksToAdd}`);

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
            console.log(`[mm] placed buy order user=${BUY_USER_ID} price=${bidPrice} orderId=${response.data?.orderId ?? "unknown"}`);
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
            console.log(`[mm] placed sell order user=${SELL_USER_ID} price=${askPrice} orderId=${response.data?.orderId ?? "unknown"}`);
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
            console.log(`[mm] skipping malformed buy order payload ${JSON.stringify(o)}`);
            return;
        }
        if (o.side === "buy" && (Number(o.price) > price || Math.random() < 0.5)) {
            console.log(`[mm] cancelling buy orderId=${o.id} price=${o.price}`);
            promises.push(apiClient.delete(`/api/v1/order`, {
                data: {
                    orderId: o.id,
                    market: MARKET
                }
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
            console.log(`[mm] skipping malformed sell order payload ${JSON.stringify(o)}`);
            return;
        }
        if (o.side === "sell" && (Number(o.price) < price || Math.random() < 0.5)) {
            console.log(`[mm] cancelling sell orderId=${o.id} price=${o.price}`);
            promises.push(apiClient.delete(`/api/v1/order`, {
                data: {
                    orderId: o.id,
                    market: MARKET
                }
            }));
        }
    });

    await Promise.all(promises);
    return promises.length;
}

main();

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
