import { Market } from "./types";
import { serverFetch } from "./serverApi";

export async function getMarkets(): Promise<Market[]> {
    const response = await serverFetch<{ markets: Market[] }>("markets");
    return response.markets;
}
