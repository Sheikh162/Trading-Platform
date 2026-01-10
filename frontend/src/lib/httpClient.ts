import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";


/*
the previous issue was sending it via this format: 
const response = await axios.get(`${BASE_URL}/depth?symbol=${market}`);

instead of using ?, use the params object to send params
 */

// const BASE_URL = "https://exchange-proxy.100xdevs.com/api/v1";
//const BASE_URL = "http://localhost:3000/api/v1";

const PROXY_URL = '/api/proxy'; // define this in .env

export async function getDepth(market: string): Promise<Depth> {
    const response = await axios.get(PROXY_URL, {
        params: { endpoint: 'depth', symbol: market }
    });
    return response.data;
}


export async function getTrades(market: string): Promise<Trade[]> {
    const response = await axios.get(PROXY_URL, {
        params: { endpoint: 'trades', symbol: market }
    });
    return response.data;
}

export async function getKlines(
    market: string,
    interval: string,
    startTime: number,
    endTime: number
): Promise<KLine[]> {
    const response = await axios.get(PROXY_URL, {
        params: { 
            endpoint: 'klines',
            symbol: market,
            interval,
            startTime,
            endTime
        }
    });
    const data: KLine[] = response.data;
    return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

// export async function getTicker(market: string): Promise<Ticker> {
//     const tickers = await getTickers();
//     const ticker = tickers.find(t => t.symbol === market);
//     if (!ticker) {
//         throw new Error(`No ticker found for ${market}`);
//     }
    
//     return ticker;
// }

// export async function getTickers(): Promise<Ticker[]> {
//     const response = await axios.get(PROXY_URL, {
//         params: { endpoint: 'tickers' }
//     });
//     return response.data;
// }