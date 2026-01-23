"use client";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const initialOrder = {
  market: "",
  price: "",
  quantity: "",
  side: "buy",
};

export function SwapUI({ market }: { market: string }) {
  const { userId, getToken } = useAuth(); // 2. Get the current user
  const [order, setOrder] = useState({ ...initialOrder, market });
  // Changed state to handle a string or null
  const [balance, setBalance] = useState<string | null>(null); // also display how many tata stacks user has later


  const fetchBalance = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const res = await axios.get(`http://localhost:3000/api/v1/order/balance?userId=${userId}`,{
        headers: {
            Authorization: `Bearer ${token}`
        }
      }); // create this endpoint
      setBalance(res.data.balance); // Directly sets the string value from the API
      console.log("Balance updated ", res.data.balance);
    } catch (err) {
      console.error("Failed to fetch balance ", err);
      // Set a default string value on error
      setBalance("0");
    }
  };

  useEffect(() => {
    // 4. Run this effect when the 'user' object loads or changes
    if (userId) {
        fetchBalance();
    }
  }, [userId]);

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const res = await axios.post("http://localhost:3000/api/v1/order", {
        ...order,
        userId: userId
      },{
        headers: {
            Authorization: `Bearer ${token}`
        }
      });
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
            <TabsTrigger value="buy" onClick={() => setOrder({ ...order, side: "buy" })}>
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" onClick={() => setOrder({ ...order, side: "sell" })}>
              Sell
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buy">
            {/* Pass the string balance down as a prop */}
            <OrderPanel type="buy" order={order} setOrder={setOrder} onSubmit={handleSubmit} balance={balance} />
          </TabsContent>
          <TabsContent value="sell">
            {/* Pass the string balance down as a prop */}
            <OrderPanel type="sell" order={order} setOrder={setOrder} onSubmit={handleSubmit} balance={balance} />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}

function OrderPanel({ type, order, setOrder, onSubmit, balance }: any) {
  return (
    <CardContent className="p-4 space-y-4">
      <BalanceDisplay balance={balance} />
      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          placeholder="0.00"
          type="number"
          value={order.price}
          onChange={(e) => setOrder({ ...order, price: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          placeholder="0.00"
          type="number"
          value={order.quantity}
          onChange={(e) => setOrder({ ...order, quantity: e.target.value })}
        />
      </div>
      <Button
        onClick={onSubmit}
        className={`w-full ${type === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          } text-white`}
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
      <span className="text-muted-foreground">Available Balance (INR)</span>
      <span className="font-medium">
        {formatBalance(balance)}
      </span>
    </div>
  );
}