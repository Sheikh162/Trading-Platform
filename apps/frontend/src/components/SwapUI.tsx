"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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

type OrderDraft = {
  market: string;
  price: string;
  quantity: string;
  side: "buy" | "sell";
};

type OrderPanelProps = {
  type: "buy" | "sell";
  order: OrderDraft;
  setOrder: Dispatch<SetStateAction<OrderDraft>>;
  onSubmit: () => Promise<void>;
  balance: string | null;
  baseBalance: string | null;
  baseAsset: string;
  quoteAsset: string;
};

const initialOrder: OrderDraft = {
  market: "",
  price: "",
  quantity: "",
  side: "buy",
};

export function SwapUI({ market, initialBalance }: { market: string; initialBalance?: string | null }) {
  const { userId, getToken } = useAuth();
  const [order, setOrder] = useState({ ...initialOrder, market });
  const [balance, setBalance] = useState<string | null>(initialBalance || null);
  const [baseBalance, setBaseBalance] = useState<string | null>(null);

  const baseAsset = market.split("_")[0];
  const quoteAsset = market.split("_")[1];
  
  const fetchBalances = async () => {
    if (!userId) return;
    try {
      const token = (await getToken()) as string;
      const [quoteBal, baseBal] = await Promise.all([
        getBalance(userId, token, quoteAsset),
        getBalance(userId, token, baseAsset)
      ]);
      setBalance(quoteBal);
      setBaseBalance(baseBal);
    } catch (err) {
      console.error("Failed to fetch balance ", err);
      setBalance("0");
      setBaseBalance("0");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadBalances = async () => {
      if (!userId) return;

      try {
        const token = (await getToken()) as string;
        const [quoteBal, baseBal] = await Promise.all([
            getBalance(userId, token, quoteAsset),
            getBalance(userId, token, baseAsset)
        ]);
        if (!cancelled) {
          setBalance(quoteBal);
          setBaseBalance(baseBal);
        }
      } catch (err) {
        console.error("Failed to fetch balance ", err);
        if (!cancelled) {
          setBalance("0");
          setBaseBalance("0");
        }
      }
    };

    void loadBalances();

    return () => {
      cancelled = true;
    }
  }, [getToken, userId, baseAsset, quoteAsset]);

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const token = await getToken();

      await axios.post(
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
      await fetchBalances();
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
            <OrderPanel
              type="buy"
              order={order}
              setOrder={setOrder}
              onSubmit={handleSubmit}
              balance={balance}
              baseBalance={baseBalance}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
            />
          </TabsContent>
          <TabsContent value="sell">
            <OrderPanel
              type="sell"
              order={order}
              setOrder={setOrder}
              onSubmit={handleSubmit}
              balance={balance}
              baseBalance={baseBalance}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
            />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

function OrderPanel({ type, order, setOrder, onSubmit, balance, baseBalance, baseAsset, quoteAsset }: OrderPanelProps) {
  return (
    <CardContent className="p-3 space-y-3">
      <BalanceDisplay 
        balance={balance} 
        baseBalance={baseBalance} 
        baseAsset={baseAsset} 
        quoteAsset={quoteAsset} 
        side={type}
      />
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

function BalanceDisplay({ 
    balance, 
    baseBalance, 
    baseAsset, 
    quoteAsset, 
    side 
}: { 
    balance: string | null; 
    baseBalance: string | null;
    baseAsset: string;
    quoteAsset: string;
    side: "buy" | "sell";
}) {
  const formatBalance = (bal: string | null, decimals = 2): string => {
    if (bal === null) return "Loading...";
    const num = parseFloat(bal);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  return (
    <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground uppercase tracking-wider">Available {quoteAsset}</span>
            <span className={`font-medium ${side === "buy" ? "text-foreground" : "text-muted-foreground"}`}>
                {formatBalance(balance, 2)}
            </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground uppercase tracking-wider">Available {baseAsset}</span>
            <span className={`font-medium ${side === "sell" ? "text-foreground" : "text-muted-foreground"}`}>
                {formatBalance(baseBalance, 4)}
            </span>
        </div>
    </div>
  );
}
