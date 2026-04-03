import { motion } from "motion/react";

const SPRING_TICKER = { type: "spring", stiffness: 500, damping: 40 } as const;

export const BidTable = ({ bids }: { bids: [string, string][] }) => {
    const MAX_ROWS = 19;

    const relevantBids = bids.slice(0, MAX_ROWS);
    const maxTotal = relevantBids.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    const bidsWithTotal = relevantBids.reduce<[string, string, number][]>((rows, [price, quantity]) => {
        const runningTotal = (rows[rows.length - 1]?.[2] ?? 0) + Number(quantity);
        rows.push([price, quantity, runningTotal]);
        return rows;
    }, []);
    
    // Pad at the bottom to ensure exactly 19 elements total
    const paddedCount = MAX_ROWS - bidsWithTotal.length;
    const padding = Array.from({ length: paddedCount }).map((_, i) => <EmptyRow key={`empty-bid-${i}`} />);

    return (
        <div className="flex flex-col w-full">
            {bidsWithTotal?.map(([price, quantity, total]) => (
                Number(quantity) !== 0 && <BidRow maxTotal={maxTotal} total={total} key={price} price={price} quantity={quantity} />
            ))}
            {padding}
        </div>
    );
}

function EmptyRow() {
    return <div className="h-[22px] w-full" />;
}

function BidRow({ price, quantity, total, maxTotal }: { price: string, quantity: string, total: number, maxTotal: number }) {
    return (
        <div className="relative grid grid-cols-3 px-4 h-[22px] items-center text-[13px] tabular-data hover:bg-muted/10 cursor-pointer overflow-hidden group">
            <motion.div 
                className="absolute top-0 right-0 h-full pointer-events-none bg-success/15 group-hover:bg-success/25"
                initial={{ width: 0 }}
                animate={{ width: `${(100 * total) / maxTotal}%` }}
                transition={SPRING_TICKER}
            />
            <div className="text-left font-medium text-[var(--color-up)]">{price}</div>
            <div className="text-right text-muted-foreground">{quantity}</div>
            <div className="text-right">{total.toFixed(2)}</div>
        </div>
    );
}
