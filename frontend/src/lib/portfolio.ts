import { Asset } from "./types";

const MOCK_ASSETS: Asset[] = [
    {
        symbol: "INR",
        name: "Indian Rupee",
        balance: "12050.00",
        value: "12050.00",
        avgBuyPrice: "1.00",
        unrealizedPnL: "0.00%",
        unrealizedPnLValue: "0.00",
        allocation: 30,
        icon: "/india-flag.png" 
    },
    {
        symbol: "SOL",
        name: "Solana",
        balance: "14.2",
        value: "185420.00",
        avgBuyPrice: "12500.00",
        unrealizedPnL: "+12.5%",
        unrealizedPnLValue: "+20500.00",
        allocation: 45,
        icon: "/solana-icon.png"
    },
    {
        symbol: "TATA",
        name: "Tata Motors",
        balance: "250",
        value: "245000.00",
        avgBuyPrice: "900.00",
        unrealizedPnL: "+8.9%",
        unrealizedPnLValue: "+20000.00",
        allocation: 25,
        icon: "/tata-icon.png"
    }
];

export async function getPortfolio(): Promise<Asset[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_ASSETS;
}