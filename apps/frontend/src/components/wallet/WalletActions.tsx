"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { getBalance } from "@/src/lib/httpClient";

export function WalletActions() {
    const { getToken, userId } = useAuth();
    const router = useRouter();
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [balance, setBalance] = useState<string | null>(null);

    const fetchBalance = async () => {
        if (!userId) return;
        try {
            const token = await getToken();
            if (!token) return;
            const bal = await getBalance(userId, token, "USDT");
            setBalance(bal);
        } catch (e) {
            console.error("Failed to fetch balance", e);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [userId, getToken]);

    const submit = async (endpoint: "wallet/deposits" | "wallet/withdrawals", amount: string) => {
        if (!userId) {
            toast.error("Sign in to manage funds");
            return;
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = await getToken();
            await axios.post(`/api/proxy?endpoint=${endpoint}`, {
                asset: "USDT",
                amount: numericAmount,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (endpoint === "wallet/deposits") {
                setDepositAmount("");
                toast.success("Deposit recorded");
            } else {
                setWithdrawAmount("");
                toast.success("Withdrawal recorded");
            }

            await fetchBalance();
            router.refresh();
        } catch (error: any) {
            toast.error(error.response?.data?.details?.message || error.response?.data?.message || "Request failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Manage Funds</CardTitle>
                        <CardDescription>Deposit or Withdraw funds instantly.</CardDescription>
                    </div>
                </div>
                {userId && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Available USDT</div>
                        <div className="text-2xl font-mono font-bold tracking-tight">
                            {balance === null ? "..." : Number(balance).toFixed(2)}
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="deposit">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="deposit">Deposit</TabsTrigger>
                        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    </TabsList>
                    <TabsContent value="deposit" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Amount (USDT)</Label>
                            <Input placeholder="e.g. 5000" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting} onClick={() => submit("wallet/deposits", depositAmount)}>Add Funds</Button>
                    </TabsContent>
                    <TabsContent value="withdraw" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Amount (USDT)</Label>
                            <Input placeholder="e.g. 1000" type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                        </div>
                        <Button variant="outline" className="w-full" disabled={isSubmitting} onClick={() => submit("wallet/withdrawals", withdrawAmount)}>Request Withdrawal</Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
