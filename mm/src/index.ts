import axios from "axios";

const BASE_URL = "http://localhost:3000";
const TOTAL_BIDS = 5;
const TOTAL_ASK = 5;
const MARKET = "TATA_INR";
const BUY_USER_ID = "2";
const SELL_USER_ID = "5";


async function main() {
    const price = 1000 + Math.random() * 10;
    const openOrders = await axios.get(`${BASE_URL}/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`); // why userId is passed? ig in order to know how many orders user has placed

    const totalBids = openOrders.data.filter((o: any) => o.side === "buy").length;
    const totalAsks = openOrders.data.filter((o: any) => o.side === "sell").length;

    const cancelledBids = await cancelBidsMoreThan(openOrders.data, price);
    const cancelledAsks = await cancelAsksLessThan(openOrders.data, price);
    

    // out of all these, you are randomly cancelling some stuff,if openorder didnt exist, this wouldnt have happened


    let bidsToAdd = TOTAL_BIDS - totalBids - cancelledBids;
    let asksToAdd = TOTAL_ASK - totalAsks - cancelledAsks;

    while(bidsToAdd > 0 || asksToAdd > 0) {
        if (bidsToAdd > 0) {
            await axios.post(`${BASE_URL}/api/v1/order`, {
                market: MARKET,
                price: (price - Math.random() * 1).toFixed(1).toString(),
                quantity: "1",
                side: "buy",
                userId: BUY_USER_ID
            });
            bidsToAdd--;
        }
        if (asksToAdd > 0) {
            await axios.post(`${BASE_URL}/api/v1/order`, {
                market: MARKET,
                price: (price + Math.random() * 1).toFixed(1).toString(),
                quantity: "1",
                side: "sell",
                userId: SELL_USER_ID
            });
            asksToAdd--;
        }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    main();
}

async function cancelBidsMoreThan(openOrders: any[], price: number) {
    let promises: any[] = [];
    openOrders.map(o => {
        if (o.side === "buy" && (o.price > price || Math.random() < 0.1)) {
            promises.push(axios.delete(`${BASE_URL}/api/v1/order`, {
                data: {
                    orderId: o.orderId,
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
        if (o.side === "sell" && (o.price < price || Math.random() < 0.5)) {
            promises.push(axios.delete(`${BASE_URL}/api/v1/order`, {
                data: {
                    orderId: o.orderId,
                    market: MARKET
                }
            }));
        }
    });

    await Promise.all(promises);
    return promises.length;
}

main();

/* 
import axios from "axios";

const BASE_URL = "http://localhost:3000";
const MARKET = "TATA_INR";

// Configuration
const CONFIG = {
  bidUser: "2",
  askUser: "5",
  targetSpread: 2, // Target spread between bids and asks
  orderCount: 5, // Number of orders per side
  orderSize: 1, // Quantity per order
  priceRange: 10, // Price range around mid price
  updateInterval: 1000, // ms between updates
  cancelProbability: 0.2, // Chance to cancel random orders
  aggressiveOrderProbability: 0.3 // Chance to place crossing order
};

// Track market state
let lastMidPrice = 1000;

async function main() {
  try {
    // Get current market state
    const [openOrders, marketDepth] = await Promise.all([
      getOpenOrders(),
      getMarketDepth()
    ]);

    // Calculate current mid price
    const currentMidPrice = calculateMidPrice(marketDepth);
    lastMidPrice = currentMidPrice || lastMidPrice;

    // Cancel random orders (for order book churn)
    await cancelRandomOrders(openOrders);

    // Place new orders
    await placeNewOrders(currentMidPrice);

    // Occasionally place aggressive orders to generate trades
    if (Math.random() < CONFIG.aggressiveOrderProbability) {
      await placeAggressiveOrder();
    }

  } catch (error) {
    console.error("Market maker error:", error);
  } finally {
    setTimeout(main, CONFIG.updateInterval);
  }
}

// Helper functions
async function getOpenOrders() {
  const res = await axios.get(
    `${BASE_URL}/api/v1/order/open?market=${MARKET}`
  );
  return res.data;
}

async function getMarketDepth() {
  const res = await axios.get(`${BASE_URL}/api/v1/depth?market=${MARKET}`);
  return res.data;
}

function calculateMidPrice(depth: any) {
  if (!depth?.bids?.length || !depth?.asks?.length) return null;
  const bestBid = parseFloat(depth.bids[0][0]);
  const bestAsk = parseFloat(depth.asks[0][0]);
  return (bestBid + bestAsk) / 2;
}

async function cancelRandomOrders(orders: any[]) {
  const cancelPromises = orders.map(order => {
    if (Math.random() < CONFIG.cancelProbability) {
      return axios.delete(`${BASE_URL}/api/v1/order`, {
        data: {
          orderId: order.orderId,
          market: MARKET
        }
      });
    }
  }).filter(Boolean);

  await Promise.all(cancelPromises);
}

async function placeNewOrders(midPrice: number | null) {
  const priceCenter = midPrice || lastMidPrice;
  const spread = CONFIG.targetSpread / 2;

  // Place bids
  for (let i = 0; i < CONFIG.orderCount; i++) {
    const price = (priceCenter - spread - Math.random() * CONFIG.priceRange).toFixed(1);
    await placeOrder("buy", price);
  }

  // Place asks
  for (let i = 0; i < CONFIG.orderCount; i++) {
    const price = (priceCenter + spread + Math.random() * CONFIG.priceRange).toFixed(1);
    await placeOrder("sell", price);
  }
}

async function placeAggressiveOrder() {
  const depth = await getMarketDepth();
  if (!depth?.asks?.length || !depth?.bids?.length) return;

  // Randomly choose to place aggressive bid or ask
  if (Math.random() > 0.5) {
    // Place bid that crosses spread
    const aggressivePrice = (parseFloat(depth.asks[0][0]) + 0.1;
    await placeOrder("buy", aggressivePrice.toFixed(1));
  } else {
    // Place ask that crosses spread
    const aggressivePrice = (parseFloat(depth.bids[0][0]) - 0.1;
    await placeOrder("sell", aggressivePrice.toFixed(1));
  }
}

async function placeOrder(side: "buy" | "sell", price: string) {
  await axios.post(`${BASE_URL}/api/v1/order`, {
    market: MARKET,
    price,
    quantity: CONFIG.orderSize.toString(),
    side,
    userId: side === "buy" ? CONFIG.bidUser : CONFIG.askUser
  });
}

// Start the market maker
main().catch(console.error);
*/