import { MarketBar } from "@/src/components/MarketBar";
import { SwapUI } from "@/src/components/SwapUI";
import { Depth } from "@/src/components/depth/Depth";
import { UserOrders } from "@/src/components/UserOrders";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getTicker, getDepth, getBalance } from "@/src/lib/httpClient";
import { TradeViewWrapper } from "@/src/components/TradeViewWrapper";

// A simple skeleton for Heavy components
function SkeletonLoader() {
    return <div className="animate-pulse bg-muted/20 w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;

  // Vercel Best Practice: async-parallel
  const [ticker, depth] = await Promise.all([
      getTicker(market).catch(() => null),
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
    <div className="w-full bg-background">
      <section className="h-[calc(100vh-64px)] min-h-[720px] w-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full border-t border-border">
          <ResizablePanel defaultSize={75} minSize={50}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={9} minSize={7} maxSize={12} className="border-b border-border min-h-[60px]">
                <MarketBar market={market} initialTicker={ticker} />
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={91} minSize={70}>
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={75} minSize={50} className="border-r border-border relative">
                    <Suspense fallback={<SkeletonLoader />}>
                      <TradeViewWrapper market={market} />
                    </Suspense>
                  </ResizablePanel>

                  <ResizableHandle />

                  <ResizablePanel defaultSize={25} minSize={18} className="min-w-[280px]">
                    <div className="h-full w-full">
                      <Suspense fallback={<SkeletonLoader />}>
                        <Depth market={market} initialBids={depth.bids} initialAsks={depth.asks} />
                      </Suspense>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={25} minSize={20} maxSize={30} className="border-l border-border min-w-[300px]">
            <ScrollArea className="h-full w-full bg-card/10">
              <div className="p-0">
                <SwapUI market={market} initialBalance={balance} />
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>

      <section className="min-h-[calc(100vh-64px)] border-t border-border bg-card/20">
        <UserOrders market={market} />
      </section>
    </div>
  );
}
