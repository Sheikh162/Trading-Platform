"use client";

import { useEffect, useState } from "react";
import { HoldingsTable } from "@/src/components/portfolio/HoldingsTable";
import { getPortfolio } from "@/src/lib/portfolio";
import { Asset } from "@/src/lib/types";

export default function PortfolioPage() {
    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        getPortfolio().then(setAssets);
    }, []);

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
            </div>
            
            <div className="grid gap-6">
                {/* Allocation Chart could go here */}
                <HoldingsTable assets={assets} />
            </div>
        </div>
    );
}