"use client";

import { useEffect, useState } from "react"; //
import { useRouter } from "next/navigation";
import { Sparkline } from "./Sparkline";
import { getMarkets } from "../lib/market";
import { Market } from "../lib/types";


export const Markets = () => {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]); // Initialize state

  // Fetch data on component mount
  useEffect(() => {
    const fetchMarkets = async () => {
      const data = await getMarkets();
      setMarkets(data);
    };
    fetchMarkets();
  }, []);

  const handleRowClick = (marketId: string) => {
    router.push(`/trade/${marketId}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(2) + "B";
    }
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(2) + "M";
    }
    return value.toLocaleString();
  };

  return (
    <div className="w-full bg-background border rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
          <tr>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Price</th>
            <th className="px-6 py-4">24h Change</th>
            <th className="px-6 py-4 hidden md:table-cell">24h Volume</th>
            <th className="px-6 py-4 hidden md:table-cell">Market Cap</th>
            <th className="px-6 py-4 hidden lg:table-cell">Last 7 Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {/* Map over the 'markets' state instead of a constant */}
          {markets.map((market) => {
            const isPositive = market.change24h >= 0;
            const color = isPositive ? "#22c55e" : "#ef4444"; 

            return (
              <tr
                key={market.id}
                onClick={() => handleRowClick(market.id)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* Ensure you are using 'market.image' as defined in types */}
                    <img
                      src={market.image}
                      alt={market.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-semibold">{market.name}</div>
                      <div className="text-xs text-muted-foreground">{market.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">
                  {formatCurrency(market.price)}
                </td>
                <td className={`px-6 py-4 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  {isPositive ? "+" : ""}
                  {market.change24h}%
                </td>
                <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                  {formatVolume(market.volume24h)}
                </td>
                 <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                  {formatVolume(market.marketCap)}
                </td>
                <td className="px-6 py-2 hidden lg:table-cell">
                  <Sparkline data={market.priceHistory} color={color} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};