"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner"; // Assuming you installed sonner as recommended
import { getUserOrders } from "../lib/orders";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { Order } from "../lib/types";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function UserOrders({ market }: { market: string }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await getUserOrders(market);
                setOrders(data);
            } catch (error) {
                console.error("Failed to fetch orders", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [market]);

    const handleCancel = (orderId: string) => {
        // Future: Call API to cancel
        toast.success(`Order ${orderId} cancelled`);
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };

    if (isLoading) {
        return <div className="p-4 text-center text-xs text-muted-foreground">Loading orders...</div>;
    }

    const openOrders = orders.filter(o => ["OPEN", "PARTIALLY_FILLED"].includes(o.status));
    const historyOrders = orders.filter(o => !["OPEN", "PARTIALLY_FILLED"].includes(o.status));

    return (
        <div className="w-full h-full flex flex-col bg-card/20 border-t border-border">
            <Tabs defaultValue="open" className="w-full">
                <div className="px-4 py-2 border-b border-border flex items-center">
                    <TabsList className="bg-transparent h-8 p-0 gap-4">
                        <TabsTrigger 
                            value="open" 
                            className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs text-muted-foreground transition-none"
                        >
                            Open Orders
                        </TabsTrigger>
                        <TabsTrigger 
                            value="history" 
                            className="mx-4 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-xs text-muted-foreground transition-none"
                        >
                            Order History
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar min-h-[200px]">
                    <TabsContent value="open" className="m-0 h-full">
                        <OrdersTable orders={openOrders} onCancel={handleCancel} showAction />
                    </TabsContent>
                    <TabsContent value="history" className="m-0 h-full">
                        <OrdersTable orders={historyOrders} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function OrdersTable({ orders, onCancel, showAction = false }: { orders: Order[], onCancel?: (id: string) => void, showAction?: boolean }) {
    if (orders.length === 0) {
        return <div className="p-8 text-center text-xs text-muted-foreground">No orders found</div>;
    }

    return (
        <div className="w-full">
            <div className="grid grid-cols-6 px-4 py-2 text-xs text-muted-foreground font-medium sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
                <div>Side</div>
                <div>Price</div>
                <div>Qty</div>
                <div>Filled</div>
                <div>Status</div>
                {showAction && <div className="text-right">Action</div>}
            </div>
            {orders.map((order) => (
                <div key={order.id} className="grid grid-cols-6 px-4 py-3 text-xs border-b border-border/50 hover:bg-muted/30 transition-colors items-center">
                    <div className={cn(
                        "font-medium uppercase",
                        order.side === "buy" ? "text-green-500" : "text-red-500"
                    )}>
                        {order.side}
                    </div>
                    <div>{order.price}</div>
                    <div>{order.quantity}</div>
                    <div>{order.filled}</div>
                    <div className="opacity-80">{order.status.replace("_", " ")}</div>
                    
                    {showAction && onCancel && (
                        <div className="text-right">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                onClick={() => onCancel(order.id)}
                            >
                                ✕
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}