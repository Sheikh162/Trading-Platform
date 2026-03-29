import { Markets } from "@/src/components/Markets";
import { getMarkets } from "@/src/lib/market";

export default async function Page() {
    const markets = await getMarkets();
    return (
        <main className="mx-auto max-w-7xl px-4 md:px-8 py-12 pt-24 space-y-8 min-h-screen">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-medium tracking-tighter text-foreground">Market Overview</h1>
            </div>
            <Markets initialMarkets={markets} />
        </main>
    );
}