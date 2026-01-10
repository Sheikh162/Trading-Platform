"use client";
import { MarketBar } from "@/src/components/MarketBar";
import { SwapUI } from "@/src/components/SwapUI";
import { TradeView } from "@/src/components/TradeView";
import { Depth } from "@/src/components/depth/Depth";
import { useParams } from "next/navigation";

export default function Page() {
    const { market } = useParams();
    return <div className="flex flex-row flex-1">
        <div className="flex flex-col flex-1">
            <MarketBar market={market as string} />
            <div className="flex flex-row h-[920px]">
                <div className="flex flex-col flex-1 w-[400px]">
                    <TradeView market={market as string} />
                </div>
                <div className="flex flex-col w-[300px] overflow-hidden">
                    <Depth market={market as string} /> 
                </div>
            </div>
        </div>
        <div className="w-[10px] flex-col border-l"></div>
        <div>
            <div className="flex flex-col w-[300px]">
                <SwapUI market={market as string} />
            </div>
        </div>
    </div>
}