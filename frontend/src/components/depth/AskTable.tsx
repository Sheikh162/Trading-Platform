import { motion } from "motion/react";

const SPRING_TICKER = { type: "spring", stiffness: 500, damping: 40 } as const;

export const AskTable = ({ asks }: { asks: [string, string][] }) => {
    let currentTotal = 0;
    const MAX_ROWS = 19;
    
    const relevantAsks = asks.slice(0, MAX_ROWS);
    const maxTotal = relevantAsks.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);
    
    const asksWithTotal: [string, string, number][] = relevantAsks.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    asksWithTotal.reverse(); // Lowest prices at bottom, closer to center ticker

    // Pad at the top to ensure exactly 19 elements
    const paddedCount = MAX_ROWS - asksWithTotal.length;
    const padding = Array.from({ length: paddedCount }).map((_, i) => <EmptyRow key={`empty-ask-${i}`} />);

    return (
        <div className="flex flex-col w-full">
            {padding}
            {asksWithTotal.map(([price, quantity, total]) => (
                Number(quantity) !== 0 && <AskRow maxTotal={maxTotal} key={price} price={price} quantity={quantity} total={total} />
            ))}
        </div>
    );
}

function EmptyRow() {
    return <div className="h-[22px] w-full" />;
}

function AskRow({ price, quantity, total, maxTotal }: { price: string, quantity: string, total: number, maxTotal: number }) {
    return (
        <div className="relative grid grid-cols-3 px-4 h-[22px] items-center text-[13px] tabular-data hover:bg-muted/10 cursor-pointer overflow-hidden group">
            <motion.div 
                className="absolute top-0 right-0 h-full pointer-events-none bg-destructive/15 group-hover:bg-destructive/25"
                initial={{ width: 0 }}
                animate={{ width: `${(100 * total) / maxTotal}%` }}
                transition={SPRING_TICKER}
            />
            <div className="text-left font-medium text-[var(--color-down)]">{price}</div>
            <div className="text-right text-muted-foreground">{quantity}</div>
            <div className="text-right">{total?.toFixed(2)}</div>
        </div>
    );
}