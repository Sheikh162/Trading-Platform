import { Order } from "./types";
import axios from "axios";

const PROXY_URL = "/api/proxy";

export async function getUserOrders(market: string, token: string): Promise<Order[]> {
    const response = await axios.get(PROXY_URL, {
        params: {
            endpoint: "order/history",
            market,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
}

export async function cancelOrder(orderId: string, market: string, token: string): Promise<void> {
    await axios.delete(PROXY_URL, {
        params: { endpoint: "order" },
        headers: {
            Authorization: `Bearer ${token}`,
        },
        data: {
            orderId,
            market,
        },
    });
}
