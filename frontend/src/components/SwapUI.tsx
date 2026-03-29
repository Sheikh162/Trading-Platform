"use client";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { getBalance } from "../lib/httpClient";

const initialOrder = {
  market: "",
  price: "",
  quantity: "",
  side: "buy",
};

export function SwapUI({ market, initialBalance }: { market: string; initialBalance?: string | null }) {
  const { userId, getToken } = useAuth(); // 2. Get the current user
  const [order, setOrder] = useState({ ...initialOrder, market });
  // Changed state to handle a string or null
  const [balance, setBalance] = useState<string | null>(initialBalance || null); // also display how many btc stacks user has later
  
  const fetchBalance = async () => {
    if (!userId) return;
    try {
      const token = (await getToken()) as string;
      const balanceValue = await getBalance(userId, token);
      setBalance(balanceValue);
      console.log("Balance updated:", balanceValue);
    } catch (err) {
      console.error("Failed to fetch balance ", err);
      setBalance("0");
    }
  };

  useEffect(() => {
    // We already have initialBalance, so we only fetch again if balance is null
    if (userId && balance === null) {
      fetchBalance();
    }
  }, [userId]);

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      // const res = await axios.post(
      //   `${process.env.NEXT_PUBLIC_API_URL}/order`,
      //   {
      //     ...order,
      //     userId: userId,
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${token}`,
      //     },
      //   },
      // );

      const res = await axios.post(
        `/api/proxy?endpoint=order`, 
        {
          ...order,
          userId: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await fetchBalance();
      console.log("Order placed ", res.data);
    } catch (err) {
      console.error("Order failed ", err);
    }
  };

  return (
    <Card className="w-full max-w-md border-0 bg-transparent">
      <CardHeader className="p-2">
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="buy"
              onClick={() => setOrder({ ...order, side: "buy" })}
            >
              Buy
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              onClick={() => setOrder({ ...order, side: "sell" })}
            >
              Sell
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buy">
            {/* Pass the string balance down as a prop */}
            <OrderPanel
              type="buy"
              order={order}
              setOrder={setOrder}
              onSubmit={handleSubmit}
              balance={balance}
            />
          </TabsContent>
          <TabsContent value="sell">
            {/* Pass the string balance down as a prop */}
            <OrderPanel
              type="sell"
              order={order}
              setOrder={setOrder}
              onSubmit={handleSubmit}
              balance={balance}
            />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

function OrderPanel({ type, order, setOrder, onSubmit, balance }: any) {
  return (
    <CardContent className="p-3 space-y-3">
      <BalanceDisplay balance={balance} />
      <div className="space-y-1.5">
        <Label htmlFor="price" className="text-xs font-light tracking-[0.05em] uppercase text-muted-foreground">Price</Label>
        <Input
          id="price"
          placeholder="0.00"
          type="number"
          className="tabular-nums"
          value={order.price}
          onChange={(e) => setOrder({ ...order, price: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quantity" className="text-xs font-light tracking-[0.05em] uppercase text-muted-foreground">Quantity</Label>
        <Input
          id="quantity"
          placeholder="0.00"
          type="number"
          className="tabular-nums"
          value={order.quantity}
          onChange={(e) => setOrder({ ...order, quantity: e.target.value })}
        />
      </div>
      <Button
        onClick={onSubmit}
        className={`w-full ${
          type === "buy"
            ? "bg-[color-mix(in_srgb,var(--color-up)_80%,transparent)] hover:bg-[var(--color-up)]"
            : "bg-[color-mix(in_srgb,var(--color-down)_80%,transparent)] hover:bg-[var(--color-down)]"
        } text-white transition-none`}
      >
        {type === "buy" ? "Buy" : "Sell"}
      </Button>
    </CardContent>
  );
}

// This component now accepts a string and handles parsing
function BalanceDisplay({ balance }: { balance: string | null }) {
  // Function to safely parse and format the balance string
  const formatBalance = (bal: string | null): string => {
    if (bal === null) return "Loading...";

    const num = parseFloat(bal);
    // Check if the parsed number is valid, otherwise show 0.00
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Available Balance (USDT)</span>
      <span className="font-medium">{formatBalance(balance)}</span>
    </div>
  );
}
