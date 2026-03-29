import { Markets } from "@/src/components/Markets";

export default function MarketsSection({ initialMarkets }: { initialMarkets: any }) {
  return (
    <div className="w-full bg-muted/10 border-y border-border backdrop-blur-sm py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 flex flex-col items-start gap-3">
          <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl text-foreground">Today's Markets</h2>
          <p className="text-muted-foreground text-lg text-balance max-w-2xl">
            Real-time price data from the Vertex matching engine.
          </p>
        </div>
        <Markets initialMarkets={initialMarkets} />
      </div>
    </div>
  );
}
