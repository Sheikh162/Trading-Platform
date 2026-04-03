import "dotenv/config"; 
import axios from "axios";

const BASE_URL = process.env.API_BASE_URL 
const TOTAL_BIDS = 30;
const TOTAL_ASK = 30;
const MARKET = "BTC_USDT";
const BUY_USER_ID = "2";
const SELL_USER_ID = "5";
let flag=false;

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
      flag=true
      console.log("API is up!");
      break;
    } catch (e) {
      console.log("API not ready, retrying...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
    if(!flag) await waitForApi();
    const price = 1000 + Math.random() * 10;
    
    // Fetch open orders for BOTH bots independently so it doesn't leak memory or hallucinate empty asks
    const openBidsResponse = await apiClient.get(`/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`);
    const openAsksResponse = await apiClient.get(`/api/v1/order/open?userId=${SELL_USER_ID}&market=${MARKET}`);
    
    const openBidsData = openBidsResponse.data || [];
    const openAsksData = openAsksResponse.data || [];

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
            const response = await apiClient.post(`/api/v1/order`, {
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
            const response = await apiClient.post(`/api/v1/order`, {
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

async function cancelBidsMoreThan(openOrders: any[], price: number) {
    let promises: any[] = [];
    openOrders.map(o => {
        if (!o?.id) {
            console.log(`[mm] skipping malformed buy order payload ${JSON.stringify(o)}`);
            return;
        }
        if (o.side === "buy" && (o.price > price || Math.random() < 0.5)) {
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

async function cancelAsksLessThan(openOrders: any[], price: number) {
    let promises: any[] = [];
    openOrders.map(o => {
        if (!o?.id) {
            console.log(`[mm] skipping malformed sell order payload ${JSON.stringify(o)}`);
            return;
        }
        if (o.side === "sell" && (o.price < price || Math.random() < 0.5)) {
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

// import "dotenv/config";
// import axios from "axios";
// import WebSocket from "ws";

// const BASE_URL = process.env.API_BASE_URL
// const MARKET = "BTC_USDT";
// const MM_USER_ID = "5";       // Maker (Liquidity Provider)
// const PAINTER_USER_ID = "2";  // Taker (The Artist) <--- NEW

// // CONFIGURATION
// const SPREAD = 0.002; // Tight spread (0.2%)
// const ORDER_SIZE = 10;
// const PAINTER_INTERVAL = 3000; // Paint a trade every 3 seconds

// let currentPrice = 0;
// let lastPaintedPrice = 0;

// const apiClient = axios.create({
//     baseURL: BASE_URL,
//     headers: {
//         "x-admin-secret": process.env.ADMIN_SECRET
//     }
// })

// function connectToBinance() {
//     const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

//     ws.on('message', (data: any) => {
//         const trade = JSON.parse(data.toString());
//         // Scale the price down
//         currentPrice = parseFloat(trade.p) ;
//     });
// }

// // Update your Binance WebSocket listener
// // function connectToBinance() {
// //     const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

// //     ws.on('message', async (data: any) => {
// //         const trade = JSON.parse(data.toString());
// //         const price = parseFloat(trade.p);
// //         const now = new Date();
        
// //         // 1. Reset logic on new minute
// //         if (now.getMinutes() !== currentMinute) {
// //             currentMinute = now.getMinutes();
// //             minuteHigh = -Infinity;
// //             minuteLow = Infinity;
// //             // Force a trade immediately to set the "Open" of the new candle
// //             await executeTrade(price); 
// //             return;
// //         }

// //         // 2. Logic: Only trade if it changes the Candle Shape (High/Low)
// //         //    OR if it's been 2 seconds since last trade (to keep "Close" fresh)
        
// //         const isNewHigh = price > minuteHigh;
// //         const isNewLow = price < minuteLow;
// //         const isTimeUpdate = (Date.now() - lastTradeTime) > 2000;

// //         if (isNewHigh || isNewLow || isTimeUpdate) {
// //             // Update our local memory
// //             if (isNewHigh) minuteHigh = price;
// //             if (isNewLow) minuteLow = price;
            
// //             // Execute the trade to paint the chart
// //             await executeTrade(price);
// //         }
// //     });
// // }

// // Job 1: Provide Liquidity (The Walls)
// async function syncLiquidity() {
//     if (currentPrice === 0) return;

//     const buyPrice = (currentPrice * (1 - SPREAD)).toFixed(2);
//     const sellPrice = (currentPrice * (1 + SPREAD)).toFixed(2);

//     try {
//         // --- STEP 1: Fetch Open Orders for this Bot ---
//         const openOrders = await apiClient.get(`/api/v1/order/open?userId=${MM_USER_ID}&market=${MARKET}`);
        
//         // --- STEP 2: Cancel Each Order Individually ---
//         if (openOrders.data.length > 0) {
//             const cancelPromises = openOrders.data.map((o: any) => 
//                 apiClient.delete(`/api/v1/order`, {
//                     data: { 
//                         orderId: o.orderId, // We must pass the specific ID
//                         market: MARKET 
//                     }
//                 })
//             );
//             await Promise.all(cancelPromises);
//             console.log(`Cancelled ${openOrders.data.length} stale orders.`);
//         }

//         // --- STEP 3: Place New Orders ---
//         await Promise.all([
//             apiClient.post(`/api/v1/order`, {
//                 market: MARKET, price: buyPrice, quantity: ORDER_SIZE, side: "buy", userId: MM_USER_ID
//             }),
//             apiClient.post(`/api/v1/order`, {
//                 market: MARKET, price: sellPrice, quantity: ORDER_SIZE, side: "sell", userId: MM_USER_ID
//             })
//         ]);

//         console.log(`Liquidity Updated: Bid ${buyPrice} / Ask ${sellPrice}`);

//     } catch (e: any) {
//         console.error("Liquidity Error:", e.response?.data || e.message);
//     }
// }

// // Job 2: Paint the Chart (The Artist)
// async function paintChart() {
//     if (currentPrice === 0) return;
    
//     // DELETE or COMMENT OUT this line:
//     // if (Math.abs(currentPrice - lastPaintedPrice) < (currentPrice * 0.001)) return;

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
