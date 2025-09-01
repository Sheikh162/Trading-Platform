import axios from "axios";

const BASE_URL = process.env.API_BASE_URL /* || "http://localhost:3000"; */
const TOTAL_BIDS = 5;
const TOTAL_ASK = 5;
const MARKET = "TATA_INR";
const BUY_USER_ID = "2";
const SELL_USER_ID = "5";
let flag=false;

/* async function waitForApi() {
  while (true) {
    try {
      await axios.get(`${BASE_URL}/api/v1/order/open?userId=${BUY_USER_ID}&market=${MARKET}`); // or `/api/v1/order/open`
      flag=true
      console.log("API is up!");
      break;
    } catch (e) {
      console.log("API not ready, retrying...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
} */

async function main() {
    //if(!flag) await waitForApi();
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
        if (o.side === "buy" && (o.price > price || Math.random() < 0.5)) {
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