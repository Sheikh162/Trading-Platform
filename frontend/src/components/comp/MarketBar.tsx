"use client";

import { SignalingManager } from "@/src/lib/SignalingManager";
import { Ticker } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "@radix-ui/react-navigation-menu";
import { useState, useEffect } from "react";
import { navigationMenuTriggerStyle } from "../ui/navigation-menu";


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
        <div className="border-b">
            <div className="container flex h-16 max-w-screen-2xl items-center">
                <TickerComponent market={market} />
                <NavigationMenu className="hidden md:flex ml-6">
                    <NavigationMenuList>
                        {marketStats.map((stat) => (
                            <NavigationMenuItem key={stat.label}>
                                <div className={cn(navigationMenuTriggerStyle(), "flex-col items-start h-auto cursor-default")}>
                                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                                    <span className={cn("font-semibold text-sm", stat.className)}>{stat.value || '-'}</span>
                                </div>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </div>
    );
    
}



function TickerComponent({ market }: { market: string }) {
    // This part can be enhanced to show dynamic images based on the market
    return (
        <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
                <img alt="Base Asset" className="h-6 w-6 rounded-full border-2 border-background" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" />
                <img alt="Quote Asset" className="h-6 w-6 rounded-full border-2 border-background" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" />
            </div>
            <span className="font-semibold text-lg">{market.replace("_", " / ")}</span>
        </div>
    );
}


/* "use client";
import { useEffect, useState } from "react";
import { Ticker } from "../utils/types";
import { getTicker } from "../utils/httpClient";
import { SignalingManager } from "../utils/SignalingManager";

export const MarketBar = ({market}: {market: string}) => {
    const [ticker, setTicker] = useState<Ticker | null>(null);

    useEffect(() => {
        getTicker(market).then(setTicker);
        SignalingManager.getInstance().registerCallback("ticker", (data: Partial<Ticker>)  =>  setTicker(prevTicker => ({
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
        })), `TICKER-${market}`);
        SignalingManager.getInstance().sendMessage({"method":"SUBSCRIBE","params":[`ticker.${market}`]}	);

        return () => {
            SignalingManager.getInstance().deRegisterCallback("ticker", `TICKER-${market}`);
            SignalingManager.getInstance().sendMessage({"method":"UNSUBSCRIBE","params":[`ticker.${market}`]}	);
        }
    }, [market])
    // 

    return <div>
        <div className="flex items-center flex-row relative w-full overflow-hidden border-b border-slate-800">
            <div className="flex items-center justify-between flex-row no-scrollbar overflow-auto pr-4">
                    <TickerComponent market={market} />
                    <div className="flex items-center flex-row space-x-8 pl-4">
                        <div className="flex flex-col h-full justify-center">
                            <p className={`font-medium tabular-nums text-greenText text-md text-green-500`}>${ticker?.lastPrice}</p>
                            <p className="font-medium text-sm tabular-nums">${ticker?.lastPrice}</p>
                        </div>
                        <div className="flex flex-col">
                            <p className={`font-medium text-slate-400 text-sm`}>24H Change</p>
                            <p className={` text-sm font-medium tabular-nums leading-5 text-greenText ${Number(ticker?.priceChange) > 0 ? "text-green-500" : "text-red-500"}`}>{Number(ticker?.priceChange) > 0 ? "+" : ""} {ticker?.priceChange} {Number(ticker?.priceChangePercent)?.toFixed(2)}%</p></div><div className="flex flex-col">
                                <p className="font-medium text-slate-400 text-sm">24H High</p>
                                <p className="text-sm font-medium tabular-nums leading-5">{ticker?.high}</p>
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-medium text-slate-400 text-sm">24H Low</p>
                                    <p className="text-sm font-medium tabular-nums leading-5">{ticker?.low}</p>
                                </div>
                            <button type="button" className="font-medium transition-opacity hover:opacity-80 hover:cursor-pointer text-base text-left" data-rac="">
                                <div className="flex flex-col">
                                    <p className="font-medium text-slate-400 text-sm">24H Volume</p>
                                    <p className="mt-1 text-sm font-medium tabular-nums leading-5">{ticker?.volume}
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

}

function TickerComponent({market}: {market: string}) {
    return <div className="flex h-[60px] shrink-0 space-x-4">
        <div className="flex flex-row relative ml-2 -mr-4">
            <img alt="SOL Logo" loading="lazy" decoding="async" data-nimg="1" className="z-10 rounded-full h-6 w-6 mt-4 outline-baseBackgroundL1"  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" />
            <img alt="USDC Logo" loading="lazy"decoding="async" data-nimg="1" className="h-6 w-6 -ml-2 mt-4 rounded-full" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVvBqZC_Q1TSYObZaMvK0DRFeHZDUtVMh08Q&s" />
        </div>
        <button type="button" className="react-aria-Button" data-rac="">
            <div className="flex items-center justify-between flex-row cursor-pointer rounded-lg p-3 hover:opacity-80">
                <div className="flex items-center flex-row gap-2 undefined">
                    <div className="flex flex-row relative">
                        <p className="font-medium text-sm undefined">{market.replace("_", " / ")}</p>
                    </div>
                </div>
            </div>
        </button>
    </div>
} */