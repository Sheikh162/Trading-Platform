import { Activity } from "react";
import { StatCard } from "@/src/components/dashboard/StatCard";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { TransactionTable } from "@/src/components/wallet/TransactionTable";
import { getDashboardStats, getTransactions } from "@/src/lib/wallet";
import { Wallet, TrendingUp, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
    // Vercel Best Practice: async-parallel
    const [stats, allTxns] = await Promise.all([
        getDashboardStats(),
        getTransactions()
    ]);

    const recentTxns = allTxns.slice(0, 3);

    return (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-12 space-y-8">
            <h1 className="text-3xl font-medium">Dashboard</h1>

            {/* Interlocking Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
                {/* Hero Stat: spans 2 cols */}
                <div className="md:col-span-2 lg:col-span-2 h-full">
                    <StatCard
                        title="Total Balance"
                        value={stats.totalBalance}
                        subValue={`${stats.pnl24h} (${stats.pnl24hPercent})`}
                        icon={Wallet}
                        trend="up"
                    />
                </div>
                {/* Secondary Stat */}
                <div className="md:col-span-1 lg:col-span-1 h-full">
                    <StatCard
                        title="24h Profit"
                        value={stats.pnl24h}
                        icon={TrendingUp}
                        trend="up"
                    />
                </div>
                {/* Tertiary Stat */}
                <div className="md:col-span-1 lg:col-span-1 h-full">
                    <StatCard
                        title="Top Performer"
                        value={stats.bestPerformer.symbol}
                        subValue={stats.bestPerformer.change}
                        icon={TrendingUp}
                        trend="up"
                    />
                </div>

                {/* Main Table spans 3 cols */}
                <div className="md:col-span-2 lg:col-span-3">
                    <div className="h-full rounded-sm border border-border/50 bg-card p-6 shadow-md ring-1 ring-inset ring-foreground/5 relative overflow-hidden space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-medium">Recent Activity</h2>
                            <Link href="/wallet">
                                <Button variant="ghost" size="sm" className="text-xs">View All <ArrowRight className="ml-2 h-3 w-3" /></Button>
                            </Link>
                        </div>
                        <TransactionTable transactions={recentTxns} />
                    </div>
                </div>

                {/* Quick Trade spans 1 col */}
                <div className="md:col-span-1 lg:col-span-1">
                    <div className="h-full rounded-sm border border-border/50 bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-md ring-1 ring-inset ring-foreground/5 relative overflow-hidden">
                        <div className="p-3 bg-background rounded-sm border shadow-sm ring-1 ring-inset ring-foreground/5">
                            <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-medium">Quick Trade</h3>
                            <p className="text-sm text-muted-foreground">Jump back into the action.</p>
                        </div>
                        <Link href="/markets">
                            <Button className="w-full">Go to Markets</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}