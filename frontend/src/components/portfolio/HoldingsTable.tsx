"use client";

import { Asset } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

export function HoldingsTable({ assets }: { assets: Asset[] }) {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="grid grid-cols-5 px-6 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/20">
                <div className="col-span-2">Asset</div>
                <div className="text-right">Balance</div>
                <div className="text-right">Value (INR)</div>
                <div className="text-right">Allocation</div>
            </div>
            {assets.map((asset) => (
                <div key={asset.symbol} className="grid grid-cols-5 px-6 py-4 text-sm items-center border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                           {/* Replace with <Image> later */}
                           {asset.symbol[0]}
                        </div>
                        <div>
                            <div className="font-semibold">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                        </div>
                    </div>
                    <div className="text-right font-mono">{asset.balance}</div>
                    <div className="text-right font-mono">
                        <div>₹{asset.value}</div>
                        <div className={cn("text-xs", asset.unrealizedPnL.startsWith("+") ? "text-green-500" : "text-red-500")}>
                            {asset.unrealizedPnLValue} ({asset.unrealizedPnL})
                        </div>
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                         <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${asset.allocation}%` }} />
                         </div>
                         <span className="text-xs text-muted-foreground">{asset.allocation}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
}