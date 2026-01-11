import { Transaction } from "./types";

const MOCK_TXNS: Transaction[] = [
    {
        id: "TXN_1001",
        type: "DEPOSIT",
        amount: "+₹50,000",
        status: "COMPLETED",
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        details: "UPI Deposit (HDFC Bank)"
    },
    {
        id: "TXN_1002",
        type: "TRADE_BUY",
        amount: "-₹12,400",
        status: "COMPLETED",
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        details: "Bought 10 SOL"
    },
    {
        id: "TXN_1003",
        type: "WITHDRAWAL",
        amount: "-₹5,000",
        status: "PENDING",
        timestamp: Date.now() - 1000 * 60 * 60 * 48, 
        details: "Withdrawal to SBI Account"
    }
];

export async function getTransactions(): Promise<Transaction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TXNS;
}

export async function getDashboardStats() {
    // This aggregates data from multiple sources in a real backend
    return {
        totalBalance: "₹4,42,470.00",
        pnl24h: "+₹12,234.00",
        pnl24hPercent: "+2.8%",
        openOrders: 3,
        bestPerformer: { symbol: "SOL", change: "+12.5%" }
    };
}