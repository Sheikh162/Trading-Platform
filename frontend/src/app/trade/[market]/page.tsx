import { MarketBar } from "@/src/components/MarketBar";
import { SwapUI } from "@/src/components/SwapUI";
import { Depth } from "@/src/components/depth/Depth";
import { UserOrders } from "@/src/components/UserOrders";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getTicker, getKlines, getDepth, getBalance } from "@/src/lib/httpClient";
import { TradeViewWrapper } from "@/src/components/TradeViewWrapper";

// A simple skeleton for Heavy components
function SkeletonLoader() {
    return <div className="animate-pulse bg-muted/20 w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
}

// Ensure params is an asynchronous promise-like object in Next 15+
export default async function TradePage({ params }: { params: Promise<{ market: string }> | { market: string } }) {
  // Await the params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const { market } = resolvedParams;

  const startTime = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000);
  const endTime = Math.floor(Date.now() / 1000);

  // Vercel Best Practice: async-parallel
  const [ticker, klines, depth] = await Promise.all([
      getTicker(market).catch(() => null),
      getKlines(market, "1m", startTime, endTime).catch(() => []),
      getDepth(market).catch(() => ({ bids: [], asks: [] }))
  ]);

  const authData = await auth();
  let balance = null;
  if (authData?.userId) {
      const token = await authData.getToken();
      if (token) {
          balance = await getBalance(authData.userId, token).catch(() => null);
      }
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-background overflow-hidden flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="w-full h-full border-t border-border">
        
        {/* --- LEFT SIDE: TRADING WORKSPACE --- */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <ResizablePanelGroup direction="vertical">
            
            {/* 1. HEADER (MarketBar) */}
            <ResizablePanel defaultSize={8} minSize={5} maxSize={10} className="border-b border-border min-h-[60px]">
              <MarketBar market={market} initialTicker={ticker} />
            </ResizablePanel>
            
            <ResizableHandle />

            {/* 2. MIDDLE: CHART & ORDERBOOK */}
            <ResizablePanel defaultSize={55} minSize={30}>
              <ResizablePanelGroup direction="horizontal">
                
                {/* CHART AREA */}
                <ResizablePanel defaultSize={75} minSize={50} className="border-r border-border relative">
                   <Suspense fallback={<SkeletonLoader />}>
                      <TradeViewWrapper market={market} initialData={klines} />
                   </Suspense>
                </ResizablePanel>

                <ResizableHandle />

                {/* ORDERBOOK AREA */}
                <ResizablePanel defaultSize={25} minSize={15} className="min-w-[250px]">
                  <div className="h-full w-full flex flex-col">
                    <Suspense fallback={<SkeletonLoader />}>
                        <Depth market={market} initialBids={depth.bids} initialAsks={depth.asks} />
                    </Suspense>
                  </div>
                </ResizablePanel>

              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* 3. BOTTOM: USER ORDERS */}
            {/* <ResizablePanel defaultSize={37} minSize={15}>
               <div className="h-full w-full bg-card/20">
                  <UserOrders market={market} />
               </div>
            </ResizablePanel> */}

          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* --- RIGHT SIDE: SWAP UI --- */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="border-l border-border min-w-[300px]">
          <ScrollArea className="h-full w-full bg-card/10">
            <div className="p-0">
               <SwapUI market={market} initialBalance={balance} />
            </div>
          </ScrollArea>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}