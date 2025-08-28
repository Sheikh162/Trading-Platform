"use client";
import { Ref, useEffect, useRef, useState } from "react";
import { getDepth } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { SignalingManager } from "@/src/utils/SignalingManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Ticker } from "@/src/utils/types";

export function Depth({ market }: { market: string }) {
    const [bids, setBids] = useState<[string, string][]>();
    const [asks, setAsks] = useState<[string, string][]>();
    const [ticker, setTicker] = useState<Ticker | null>(null);


    // Create refs for the scrollable container and the price element
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const priceRef = useRef<HTMLDivElement>(null);
    
    // This useEffect handles the initial centering scroll
    useEffect(() => {
            if (scrollContainerRef.current && priceRef.current && asks && bids) {
                const container = scrollContainerRef.current;
                const priceElement = priceRef.current;
    
                // Calculate the position to scroll to
                const scrollPosition =
                    priceElement.offsetTop -   // Distance from the top of the container to the price element
                    (container.clientHeight / 2) + // Minus half the container's visible height
                    (priceElement.clientHeight / 2); // Plus half the price element's height
    
                // Set the initial scroll position
                container.scrollTop = scrollPosition;
            }
    }, [asks, bids]); // Rerun this effect only when the initial asks/bids data arrives

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

        getDepth(market).then(d => {
            setBids(d.bids);
            setAsks(d.asks);
        });

        //getTicker(market).then(t => setPrice(t.lastPrice));// instead use websocket to get ticker price

        return () => {
            SignalingManager.getInstance().sendMessage({ "method": "UNSUBSCRIBE", "params": [`depth@${market}`] });
            SignalingManager.getInstance().deRegisterCallback("depth", `DEPTH-${market}`);
        }
    }, [market]);
    
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

    return (
        <Card className="w-full h-full bg-transparent border-0">
            {/* <CardHeader>
                <CardTitle>Order Book</CardTitle>
            </CardHeader> */}
            <CardContent>
                <OrderBookHeader/>
                <Total ref={scrollContainerRef}>
                    {asks && <AskTable asks={asks} />}
                    {/* {price && <div ref={priceRef} className="py-4 text-lg font-semibold text-center">{ticker?.lastPrice}</div>} */}
                    {ticker?.lastPrice && <div ref={priceRef} className="font-semibold">{ticker?.lastPrice}</div>}
                    {bids && <BidTable bids={bids} />}
                </Total>
            </CardContent>
        </Card>
    );
}

function OrderBookHeader() {
    return (
        <div className="flex justify-between text-xs text-muted-foreground pr-4 pl-4 pb-2">
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
        </div>
    );
}

function Total({children,ref}:{children:any,ref:Ref<HTMLDivElement>}){
    return (
        <div ref={ref} className="max-h-[500px] overflow-y-auto">
            {children}
        </div>
    )
}

/* "use client";
import { useEffect, useState } from "react";
import { getDepth, getTicker} from "../../utils/httpClient"; // getklines,trades also needed, do it later
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { SignalingManager } from "@/app/utils/SignalingManager";

export function Depth({ market }: {market: string}) {
    const [bids, setBids] = useState<[string, string][]>();
    const [asks, setAsks] = useState<[string, string][]>();
    const [price, setPrice] = useState<string>();


    useEffect(() => {
        const depthCallback = (data: { bids: [string, string][], asks: [string, string][] }) => {
            
            // Update asks
            setAsks(prevAsks => {
                const newAsksMap = new Map(prevAsks);
                data.asks.forEach(([price, amount]) => {
                    if (amount === "0") {
                        newAsksMap.delete(price);
                    } else {
                        newAsksMap.set(price, amount);
                    }
                });
                return Array.from(newAsksMap.entries())
                    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
            });
    
            // Update bids
            setBids(prevBids => {
                const newBidsMap = new Map(prevBids);
                data.bids.forEach(([price, amount]) => {
                    if (amount === "0") {
                        newBidsMap.delete(price);
                    } else {
                        newBidsMap.set(price, amount);
                    }
                });
                return Array.from(newBidsMap.entries())
                    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
            });
        };
    
        SignalingManager.getInstance().registerCallback("depth", depthCallback, `DEPTH-${market}`);
        
        SignalingManager.getInstance().sendMessage({"method":"SUBSCRIBE","params":[`depth@${market}`]});

        
        getDepth(market).then(d => {    
            setBids(d.bids);
            setAsks(d.asks);
        });

        getTicker(market).then(t => setPrice(t.lastPrice));
        // getTrades(market).then(t => setPrice(t[0].price)); fix this later
        // getKlines(market, "1h", 1640099200, 1640100800).then(t => setPrice(t[0].close));
        return () => {
            SignalingManager.getInstance().sendMessage({"method":"UNSUBSCRIBE","params":[`depth@${market}`]});
            SignalingManager.getInstance().deRegisterCallback("depth", `DEPTH-${market}`);
        }
    }, [])
    
    return <div>
        <TableHeader />
        {asks && <AskTable asks={asks} />}
        {price && <div>{price}</div>}
        {bids && <BidTable bids={bids} />}
    </div>
}

function TableHeader() {
    return <div className="flex justify-between text-xs">
    <div className="text-white">Price</div>
    <div className="text-slate-500">Size</div>
    <div className="text-slate-500">Total</div>
</div>
} */