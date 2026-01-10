import { Market } from "./types";

// This simulates the database response for now
const MOCK_MARKETS: Market[] = [
    {
      id: "SOL_USDC",
      name: "Solana",
      symbol: "SOL",
      image: "https://cryptologos.cc/logos/solana-sol-logo.png",
      price: 145.2,
      change24h: 5.4,
      volume24h: 1240000000,
      marketCap: 65000000000,
      priceHistory: [130, 132, 135, 134, 138, 140, 142, 141, 145, 144, 145.2],
    },
    {
      id: "BTC_USDC",
      name: "Bitcoin",
      symbol: "BTC",
      image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
      price: 64230.5,
      change24h: -1.2,
      volume24h: 32000000000,
      marketCap: 1200000000000,
      priceHistory: [65000, 64800, 64500, 64900, 64200, 64000, 63800, 64100, 64230],
    },
    {
      id: "ETH_USDC",
      name: "Ethereum",
      symbol: "ETH",
      image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      price: 3450.0,
      change24h: 2.1,
      volume24h: 15000000000,
      marketCap: 400000000000,
      priceHistory: [3300, 3320, 3350, 3380, 3400, 3420, 3410, 3430, 3450],
    },
    {
        id: "TATA_INR",
        name: "Tata Motors",
        symbol: "TATA",
        image: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        price: 980.00,
        change24h: 0.5,
        volume24h: 15000000000,
        marketCap: 400000000000,
        priceHistory: [970, 972, 975, 974, 978, 979, 980]
    }
  ];

export async function getMarkets(): Promise<Market[]> {
    // Simulate a network delay (remove this when connecting to real DB)
    // await new Promise(resolve => setTimeout(resolve, 500));
    
    return MOCK_MARKETS;

    // FUTURE IMPLEMENTATION EXAMPLE:
    // const res = await fetch('/api/tickers/summary');
    // const data = await res.json();
    // return data.map(ticker => ({ ... transform ticker to Market ... }));
}