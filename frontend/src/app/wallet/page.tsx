"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { TransactionTable } from "@/src/components/wallet/TransactionTable";
import { Transaction } from "@/src/lib/types";
import { getTransactions } from "@/src/lib/wallet";
import { Label } from "@radix-ui/react-label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";


export default function WalletPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        getTransactions().then(setTransactions);
    }, []);

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Wallet & Funds</h1>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_350px]">
                {/* Left: History */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Transaction History</h2>
                    <TransactionTable transactions={transactions} />
                </div>

                {/* Right: Actions */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Funds</CardTitle>
                            <CardDescription>Deposit or Withdraw funds instantly.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="deposit">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                                </TabsList>
                                <TabsContent value="deposit" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Amount (INR)</Label>
                                        <Input placeholder="e.g. 5000" type="number" />
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700">Add Funds</Button>
                                </TabsContent>
                                <TabsContent value="withdraw" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Amount (INR)</Label>
                                        <Input placeholder="e.g. 1000" type="number" />
                                    </div>
                                    <Button variant="outline" className="w-full">Request Withdrawal</Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}