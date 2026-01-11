"use client";

import { Activity, useEffect, useState } from "react";
import { StatCard } from "@/src/components/dashboard/StatCard";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { TransactionTable } from "@/src/components/wallet/TransactionTable";
import { DashboardStats, Transaction } from "@/src/lib/types";
import { getDashboardStats, getTransactions } from "@/src/lib/wallet";
import { Wallet, TrendingUp, ArrowRight } from "lucide-react";

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);

    useEffect(() => {
        getDashboardStats().then(setStats);
        getTransactions().then(data => setRecentTxns(data.slice(0, 3))); // Top 3
    }, []);

    if (!stats) return <div className="p-10">Loading Dashboard...</div>;

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Balance" 
                    value={stats.totalBalance} 
                    subValue={`${stats.pnl24h} (${stats.pnl24hPercent})`} 
                    icon={Wallet} 
                    trend="up"
                />
                <StatCard 
                    title="24h Profit" 
                    value={stats.pnl24h} 
                    icon={TrendingUp} 
                    trend="up"
                />
                <StatCard 
                    title="Open Orders" 
                    value={stats.openOrders.toString()} 
                    icon={Activity as any} 
                />
                <StatCard 
                    title="Top Performer" 
                    value={stats.bestPerformer.symbol} 
                    subValue={stats.bestPerformer.change}
                    icon={TrendingUp} 
                    trend="up"
                />
            </div>

            {/* Content Split */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Recent Activity</h2>
                        <Link href="/wallet">
                            <Button variant="ghost" size="sm" className="text-xs">View All <ArrowRight className="ml-2 h-3 w-3"/></Button>
                        </Link>
                    </div>
                    <TransactionTable transactions={recentTxns} />
                </div>
                
                {/* Placeholder for a "Quick Trade" or "Market Watch" widget */}
                <div className="rounded-xl border bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-3 bg-background rounded-full border shadow-sm">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Quick Trade</h3>
                        <p className="text-sm text-muted-foreground">Jump back into the action.</p>
                    </div>
                    <Link href="/markets">
                        <Button>Go to Markets</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}