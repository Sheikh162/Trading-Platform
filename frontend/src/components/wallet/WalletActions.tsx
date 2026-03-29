"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";

export function WalletActions() {
    return (
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
                            <Label>Amount (USDT)</Label>
                            <Input placeholder="e.g. 5000" type="number" />
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700">Add Funds</Button>
                    </TabsContent>
                    <TabsContent value="withdraw" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Amount (USDT)</Label>
                            <Input placeholder="e.g. 1000" type="number" />
                        </div>
                        <Button variant="outline" className="w-full">Request Withdrawal</Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
