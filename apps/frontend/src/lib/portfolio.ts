import { Asset } from "./types";
import { serverFetch } from "./serverApi";
export async function getPortfolio(token?: string | null): Promise<Asset[]> {
    if (!token) {
        return [];
    }

    const response = await serverFetch<{ assets: Asset[] }>("portfolio", {
        token,
    });
    return response.assets;
}
