"use client";

import { SignalingManager } from "@/src/lib/SignalingManager";
import { Ticker } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "@radix-ui/react-navigation-menu";
import { useState, useEffect } from "react";


export const MarketBar = ({ market }: { market: string }) => {
    const [ticker, setTicker] = useState<Ticker | null>(null);

    useEffect(() => {
        //getTicker(market).then(setTicker);
        const tickerCallback = (data: Partial<Ticker>) => {
            setTicker(prevTicker => ({
                // Ensure prevTicker is not null before spreading
                ...(prevTicker || {}),
                ...data,
                // Provide default empty strings for all Ticker properties
                firstPrice: data?.firstPrice ?? prevTicker?.firstPrice ?? '',
                high: data?.high ?? prevTicker?.high ?? '',
                lastPrice: data?.lastPrice ?? prevTicker?.lastPrice ?? '',
                low: data?.low ?? prevTicker?.low ?? '',
                priceChange: data?.priceChange ?? prevTicker?.priceChange ?? '',
                priceChangePercent: data?.priceChangePercent ?? prevTicker?.priceChangePercent ?? '',
                quoteVolume: data?.quoteVolume ?? prevTicker?.quoteVolume ?? '',
                symbol: data?.symbol ?? prevTicker?.symbol ?? '',
                trades: data?.trades ?? prevTicker?.trades ?? '',
                volume: data?.volume ?? prevTicker?.volume ?? '',
            }));
        };

        SignalingManager.getInstance().registerCallback("ticker", tickerCallback, `TICKER-${market}`);
        SignalingManager.getInstance().sendMessage({ "method": "SUBSCRIBE", "params": [`ticker@${market}`] }); // change to @

        //SignalingManager.getInstance().registerCallback("depth", depthCallback, `DEPTH-${market}`);
        //SignalingManager.getInstance().sendMessage({ "method": "SUBSCRIBE", "params": [`depth@${market}`] });

        return () => {
            SignalingManager.getInstance().deRegisterCallback("ticker", `TICKER-${market}`);
            SignalingManager.getInstance().sendMessage({ "method": "UNSUBSCRIBE", "params": [`ticker@${market}`] });
        }
    }, [market]);

    const priceChange = parseFloat(ticker?.priceChange ?? '0');
    const priceChangePercent = parseFloat(ticker?.priceChangePercent ?? '0');

    const marketStats = [
        { label: "Last Price", value: `$${ticker?.lastPrice}`,className:"white"  /* className: priceChange > 0 ? "text-green-500" : "text-red-500"  */},
/*         { label: "24h Change", value: `${priceChange > 0 ? '+' : ''}${ticker?.priceChange} (${priceChangePercent.toFixed(2)}%)`, className: priceChange > 0 ? "text-green-500" : "text-red-500" },
 */        { label: "24h High", value: ticker?.high },
        { label: "24h Low", value: ticker?.low },
        { label: "24h Volume", value: ticker?.volume },
    ];

return (
        <div className="sticky w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 overflow-x-auto">
                {/* Left Side: Ticker Identity */}
                <div className="flex items-center gap-6 mr-8">
                    <TickerComponent market={market} />
                </div>

                {/* Right Side: Stats (Horizontal Layout) */}
                <div className="flex items-center space-x-6 whitespace-nowrap">
                    {marketStats.map((stat) => (
                        <div key={stat.label} className="flex flex-col items-end sm:items-start">
                            <span className="text-xs font-medium text-muted-foreground">
                                {stat.label}
                            </span>
                            <span className={cn("text-sm font-semibold tabular-nums tracking-tight", stat.className)}>
                                {stat.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TickerComponent({ market }: { market: string }) {
    return (
        <div className="flex items-center gap-3 select-none">
            <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-secondary/20 ring-1 ring-border overflow-hidden">
                <img 
                    alt={`${market} Icon`} 
                    className="h-full w-full object-cover" 
                    src="/tata-icon.png" // Using the local asset path as requested
                    onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {/* Fallback Text if Image Fails (hidden by default) */}
                <span className="absolute text-[10px] font-bold text-foreground">
                    {market.split('_')[0].charAt(0)}
                </span>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-base leading-none text-foreground">
                    {market.replace("_", " / ")}
                </span>
                <span className="text-xs text-muted-foreground font-medium mt-0.5">
                    {market.split('_')[0]}
                </span>
            </div>
        </div>
    );
}

