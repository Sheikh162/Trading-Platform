"use client";

import { MarketBar } from "@/src/components/MarketBar";
import { SwapUI } from "@/src/components/SwapUI";
import { TradeView } from "@/src/components/TradeView";
import { Depth } from "@/src/components/depth/Depth";
import { UserOrders } from "@/src/components/UserOrders"; // Assuming you created this

import { useParams } from "next/navigation";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TradePage() {
  const { market } = useParams();

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-background overflow-hidden flex flex-col">
      {/* NOTE: h-[calc(100vh-64px)] assumes your Navbar is 64px high. 
         If Navbar is separate, adjust this. 
         If Navbar is part of the layout.tsx, this ensures the trade screen fits exactly below it without scrolling.
      */}

      <ResizablePanelGroup direction="horizontal" className="w-full h-full border-t border-border">
        
        {/* --- LEFT SIDE: TRADING WORKSPACE --- */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <ResizablePanelGroup direction="vertical">
            
            {/* 1. HEADER (MarketBar) */}
            {/* fixed-size panel for the header so it doesn't shrink awkwardly */}
            <ResizablePanel defaultSize={8} minSize={5} maxSize={10} className="border-b border-border min-h-[60px]">
              <MarketBar market={market as string} />
            </ResizablePanel>
            
            <ResizableHandle />

            {/* 2. MIDDLE: CHART & ORDERBOOK */}
            <ResizablePanel defaultSize={55} minSize={30}>
              <ResizablePanelGroup direction="horizontal">
                
                {/* CHART AREA */}
                <ResizablePanel defaultSize={75} minSize={50} className="border-r border-border relative">
                  <TradeView market={market as string} />
                </ResizablePanel>

                <ResizableHandle />

                {/* ORDERBOOK AREA */}
                <ResizablePanel defaultSize={25} minSize={15} className="min-w-[250px]">
                  <div className="h-full w-full flex flex-col">
                    {/* Optional: Add tabs here for Bids/Asks if desired, for now just the Depth component */}
                    <Depth market={market as string} />
                  </div>
                </ResizablePanel>

              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* 3. BOTTOM: USER ORDERS */}
            <ResizablePanel defaultSize={37} minSize={15}>
               <div className="h-full w-full bg-card/20">
                  <UserOrders market={market as string} />
                  {/* Note: Ensure UserOrders component has h-full and internal scrolling or wrap it in ScrollArea here if needed */}
               </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* --- RIGHT SIDE: SWAP UI --- */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="border-l border-border min-w-[300px]">
          <ScrollArea className="h-full w-full bg-card/10">
            <div className="p-0">
               <SwapUI market={market as string} />
            </div>
          </ScrollArea>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}