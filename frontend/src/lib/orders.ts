import { Order } from "./types";

// Mock data to simulate active and past orders
const MOCK_ORDERS: Order[] = [
    {
        id: "1",
        market: "TATA_INR",
        type: "LIMIT",
        side: "buy",
        price: "980.50",
        quantity: "100",
        filled: "0",
        status: "OPEN",
        timestamp: Date.now() - 1000 * 60 * 5 // 5 mins ago
    },
    {
        id: "2",
        market: "TATA_INR",
        type: "LIMIT",
        side: "sell",
        price: "990.00",
        quantity: "50",
        filled: "10",
        status: "PARTIALLY_FILLED",
        timestamp: Date.now() - 1000 * 60 * 30 // 30 mins ago
    },
    {
        id: "3",
        market: "TATA_INR",
        type: "MARKET",
        side: "buy",
        price: "975.00",
        quantity: "200",
        filled: "200",
        status: "FILLED",
        timestamp: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
    }
];

export async function getUserOrders(market: string): Promise<Order[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In the future: return axios.get(`/api/orders?market=${market}`)
    return MOCK_ORDERS.filter(o => o.market === market);
}