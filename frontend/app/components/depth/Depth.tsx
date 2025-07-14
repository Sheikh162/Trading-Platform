"use client";
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
/*         getTrades(market).then(t => setPrice(t[0].price)); fix this later
        getKlines(market, "1h", 1640099200, 1640100800).then(t => setPrice(t[0].close)); */
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
}