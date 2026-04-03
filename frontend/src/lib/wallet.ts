import { Transaction } from "./types";
import { DashboardStats } from "./types";
import { serverFetch } from "./serverApi";

type WalletTransactionResponse = {
    id: string;
    type: string;
    asset: string;
    amount: string;
    status: string;
    timestamp: number;
    details: string;
};

function formatSignedAmount(amount: string, asset: string) {
    const numericAmount = Number(amount);
    const sign = numericAmount > 0 ? "+" : "";
    return `${sign}${numericAmount.toFixed(2)} ${asset}`;
}

function mapEntryType(entryType: string): Transaction["type"] {
    if (entryType.startsWith("deposit")) {
        return "DEPOSIT";
    }
    if (entryType.startsWith("withdrawal")) {
        return "WITHDRAWAL";
    }
    if (entryType === "trade_credit") {
        return "TRADE_SELL";
    }
    return "TRADE_BUY";
}

export async function getTransactions(token?: string | null): Promise<Transaction[]> {
    if (!token) {
        return [];
    }

    const response = await serverFetch<{ transactions: WalletTransactionResponse[] }>(
        "wallet/transactions",
        { token },
    );

    return response.transactions.map((txn) => ({
        id: txn.id,
        type: mapEntryType(txn.type),
        amount: formatSignedAmount(txn.amount, txn.asset),
        status: txn.status as Transaction["status"],
        timestamp: txn.timestamp,
        details: txn.details,
    }));
}

export async function getDashboardStats(token?: string | null): Promise<DashboardStats> {
    if (!token) {
        return {
            totalBalance: "0.00 USDT",
            pnl24h: "0.00 USDT",
            pnl24hPercent: "0.00%",
            openOrders: 0,
            bestPerformer: { symbol: "USDT", change: "0.00%" },
        };
    }

    const response = await serverFetch<{
        totalBalance: string;
        pnl24h: string;
        pnl24hPercent: string;
        openOrders: number;
        bestPerformer: { symbol: string; change: string };
    }>("wallet/summary", { token });

    const pnl24hValue = Number(response.pnl24h);
    const pnl24hPrefix = pnl24hValue > 0 ? "+" : "";
    const performerChange = Number(response.bestPerformer.change);
    const performerPrefix = performerChange > 0 ? "+" : "";

    return {
        totalBalance: `${Number(response.totalBalance).toFixed(2)} USDT`,
        pnl24h: `${pnl24hPrefix}${pnl24hValue.toFixed(2)} USDT`,
        pnl24hPercent: `${pnl24hPrefix}${Number(response.pnl24hPercent).toFixed(2)}%`,
        openOrders: response.openOrders,
        bestPerformer: {
            symbol: response.bestPerformer.symbol,
            change: `${performerPrefix}${performerChange.toFixed(2)}%`,
        },
    };
}
