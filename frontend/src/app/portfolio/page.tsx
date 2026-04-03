import { HoldingsTable } from "@/src/components/portfolio/HoldingsTable";
import { getPortfolio } from "@/src/lib/portfolio";
import { auth } from "@clerk/nextjs/server";

export default async function PortfolioPage() {
    const authData = await auth();
    const token = authData.userId ? await authData.getToken() : null;
    const assets = await getPortfolio(token);

    return (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-12 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-medium tracking-tighter">Portfolio</h1>
            </div>

            <div className="grid gap-6">
                {/* Allocation Chart could go here */}
                <HoldingsTable assets={assets} />
            </div>
        </div>
    );
}
