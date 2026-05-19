"use client";

import { SignalingManager } from "@/src/lib/SignalingManager";
import { Ticker } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "@radix-ui/react-navigation-menu";
import { useState, useEffect } from "react";
import Image from "next/image";


export const MarketBar = ({ market, initialTicker }: { market: string; initialTicker?: Ticker | null }) => {
    const [ticker, setTicker] = useState<Ticker | null>(initialTicker || null);

    useEffect(() => {
        // Use the initialTicker if provided, to ensure we don't start with null if data is available
        if (initialTicker) {
            setTicker(initialTicker);
        }

        const tickerCallback = (data: Partial<Ticker>) => {
            setTicker(prevTicker => {
                const updatedTicker = {
                    ...(prevTicker || {}),
                    ...data,
                } as Ticker;
                
                // Ensure all required fields have at least a '0.00' default if they are missing
                return {
                    ...updatedTicker,
                    firstPrice: updatedTicker.firstPrice ?? '0.00',
                    high: updatedTicker.high ?? '0.00',
                    lastPrice: updatedTicker.lastPrice ?? '0.00',
                    low: updatedTicker.low ?? '0.00',
                    priceChange: updatedTicker.priceChange ?? '0.00',
                    priceChangePercent: updatedTicker.priceChangePercent ?? '0.00',
                    quoteVolume: updatedTicker.quoteVolume ?? '0.00',
                    symbol: updatedTicker.symbol ?? market,
                    trades: updatedTicker.trades ?? '0',
                    volume: updatedTicker.volume ?? '0.00',
                };
            });
        };

        SignalingManager.getInstance().registerCallback("ticker", tickerCallback, `TICKER-${market}`);
        SignalingManager.getInstance().sendMessage({ "method": "SUBSCRIBE", "params": [`ticker@${market}`] });

        return () => {
            SignalingManager.getInstance().deRegisterCallback("ticker", `TICKER-${market}`);
            SignalingManager.getInstance().sendMessage({ "method": "UNSUBSCRIBE", "params": [`ticker@${market}`] });
        }
    }, [market, initialTicker]);

    const priceChange = parseFloat(ticker?.priceChange ?? '0');
    const priceChangePercent = parseFloat(ticker?.priceChangePercent ?? '0');

    const marketStats = [
        { label: "Last Price", value: `$${ticker?.lastPrice ?? '0.00'}`, className: "white" },
        { label: "24h High", value: ticker?.high ?? '0.00' },
        { label: "24h Low", value: ticker?.low ?? '0.00' },
        { label: "24h Volume", value: ticker?.volume ?? '0.00' },
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
                            <span className="text-[11px] font-light tracking-[0.05em] uppercase text-muted-foreground">
                                {stat.label}
                            </span>
                            <span className={cn("text-[13px] font-medium tabular-nums tracking-[-0.02em]", stat.className)}>
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
                <Image
                    alt={`${market} Icon`}
                    className="object-cover"
                    fill
                    src="/btc-icon.png" // Using the local asset path as requested
                />
                {/* Fallback Text if Image Fails (hidden by default) */}
                <span className="absolute text-[10px] font-medium text-foreground">
                    {market.split('_')[0].charAt(0)}
                </span>
            </div>
            <div className="flex flex-col">
                <span className="font-medium text-base leading-none text-foreground">
                    {market.replace("_", " / ")}
                </span>
                <span className="text-xs text-muted-foreground font-medium mt-0.5">
                    {market.split('_')[0]}
                </span>
            </div>
        </div>
    );
}
