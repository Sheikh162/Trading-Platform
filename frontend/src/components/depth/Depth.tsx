"use client";

import { getDepth } from "@/src/lib/httpClient";
import { SignalingManager } from "@/src/lib/SignalingManager";
import { Ticker } from "@/src/lib/types";
import { Ref, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { AskTable } from "./AskTable";
import { BidTable } from "./BidTable";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Depth({ market, initialBids, initialAsks }: { market: string, initialBids?: [string, string][], initialAsks?: [string, string][] }) {
    const [bids, setBids] = useState<[string, string][] | undefined>(initialBids);
    const [asks, setAsks] = useState<[string, string][] | undefined>(initialAsks);
    const [ticker, setTicker] = useState<Ticker | null>(null);

    // Create refs for the scrollable container and the price element
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const priceRef = useRef<HTMLDivElement>(null);

    const [isScrolledOffCenter, setIsScrolledOffCenter] = useState(false);
    const hasInitialCentered = useRef(false);

    // This useEffect handles the initial centering scroll
    useEffect(() => {
        if (!hasInitialCentered.current && scrollContainerRef.current && priceRef.current) {
            const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
            const priceElement = priceRef.current;

            if (viewport && (asks || bids)) { // Check that we've received at least some data state before sealing the center
                const scrollPosition = priceElement.offsetTop - (viewport.clientHeight / 2) + (priceElement.clientHeight / 2);
                viewport.scrollTop = scrollPosition;
                hasInitialCentered.current = true;
            }
        }
    }, [asks, bids]);

    // Handle user manual scrolling to reveal the Recenter button
    useEffect(() => {
        const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (!viewport) return;

        const handleScroll = () => {
            if (!priceRef.current) return;
            const priceElement = priceRef.current;
            const targetScroll = priceElement.offsetTop - (viewport.clientHeight / 2) + (priceElement.clientHeight / 2);
            
            // Show recenter if user scrolls more than 40px away from the center
            if (Math.abs(viewport.scrollTop - targetScroll) > 40) {
                setIsScrolledOffCenter(true);
            } else {
                setIsScrolledOffCenter(false);
            }
        };

        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
    }, []);

    const centerScroll = () => {
        const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        const priceElement = priceRef.current;
        if (viewport && priceElement) {
            const scrollPosition = priceElement.offsetTop - (viewport.clientHeight / 2) + (priceElement.clientHeight / 2);
            viewport.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            setIsScrolledOffCenter(false);
        }
    };

    useEffect(() => {
        const depthCallback = (data: { bids: [string, string][], asks: [string, string][] }) => {
            setAsks(prevAsks => {
                const newAsksMap = new Map(prevAsks);
                data.asks.forEach(([price, amount]) => {
                    if (amount === "0") newAsksMap.delete(price);
                    else newAsksMap.set(price, amount);
                });
                return Array.from(newAsksMap.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
            });

            setBids(prevBids => {
                const newBidsMap = new Map(prevBids);
                data.bids.forEach(([price, amount]) => {
                    if (amount === "0") newBidsMap.delete(price);
                    else newBidsMap.set(price, amount);
                });
                return Array.from(newBidsMap.entries()).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
            });
        };

        SignalingManager.getInstance().registerCallback("depth", depthCallback, `DEPTH-${market}`);
        SignalingManager.getInstance().sendMessage({ "method": "SUBSCRIBE", "params": [`depth@${market}`] });

        return () => {
            SignalingManager.getInstance().sendMessage({ "method": "UNSUBSCRIBE", "params": [`depth@${market}`] });
            SignalingManager.getInstance().deRegisterCallback("depth", `DEPTH-${market}`);
        }
    }, [market]);

    useEffect(() => {
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
        SignalingManager.getInstance().sendMessage({ "method": "SUBSCRIBE", "params": [`ticker@${market}`] });

        return () => {
            SignalingManager.getInstance().deRegisterCallback("ticker", `TICKER-${market}`);
            SignalingManager.getInstance().sendMessage({ "method": "UNSUBSCRIBE", "params": [`ticker@${market}`] });
        }
    }, [market]);

    return (
        <Card className="w-full h-full bg-transparent border-0 ring-0 shadow-none relative">
            <CardContent className="p-0 h-full flex flex-col relative">
                <OrderBookHeader />
                <div className="relative flex-1 overflow-hidden">
                    <Total ref={scrollContainerRef}>
                        <AskTable asks={asks || []} />
                        <div ref={priceRef} className="text-lg h-[28px] flex items-center justify-center font-medium tabular-nums tracking-[-0.02em] font-mono text-center my-1 text-[var(--color-up)]">
                            {ticker?.lastPrice ? ticker.lastPrice : '---'}
                        </div>
                        <BidTable bids={bids || []} />
                    </Total>
                    
                    {/* Floating Recenter Button */}
                    {isScrolledOffCenter && (
                        <button 
                            onClick={centerScroll}
                            className="absolute bottom-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold shadow-lg hover:scale-105 transition-transform"
                        >
                            Recenter
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function OrderBookHeader() {
    return (
        <div className="grid grid-cols-3 px-4 py-[9px] border-b border-[var(--border)]/30 mb-1 text-[11px] font-light tracking-[0.05em] uppercase text-muted-foreground">
            <span className="text-left">Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
        </div>
    );
}

function Total({ children, ref }: { children: any, ref: Ref<HTMLDivElement> }) {
    return (
        // FIXED: Replaced native div with Shadcn ScrollArea
        // Removed max-h-[500px] and overflow-y-auto to avoid double scrolling
        <ScrollArea ref={ref} className="h-full w-full rounded-md border-0">
            <div className="px-1">
                {children}
            </div>
        </ScrollArea>
    )
}