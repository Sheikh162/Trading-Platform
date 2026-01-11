import { Transaction } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
    return (
        <div className="rounded-md border">
            {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{txn.details}</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(txn.timestamp).toLocaleString()}
                        </span>
                    </div>
                    <div className="text-right">
                        <div className={cn(
                            "font-mono text-sm", 
                            txn.type === 'DEPOSIT' || txn.type === 'TRADE_SELL' ? "text-green-500" : "text-foreground"
                        )}>
                            {txn.amount}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {txn.status}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}