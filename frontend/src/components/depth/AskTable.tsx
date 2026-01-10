import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";

export const AskTable = ({ asks }: { asks: [string, string][] }) => {
    let currentTotal = 0;
    const relevantAsks = asks.slice(0, 15);
    const asksWithTotal: [string, string, number][] = relevantAsks.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    asksWithTotal.reverse();
    const maxTotal = relevantAsks.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    return (
        <Table>
            <TableBody>
                {asksWithTotal.map(([price, quantity, total]) => (
                    Number(quantity) !== 0 && <AskRow maxTotal={maxTotal} key={price} price={price} quantity={quantity} total={total} />
                ))}
            </TableBody>
        </Table>
    );
}

function AskRow({ price, quantity, total, maxTotal }: { price: string, quantity: string, total: number, maxTotal: number }) {
    return (
        <TableRow className="relative">
            <TableCell className="absolute top-0 right-0 h-full bg-red-500/20"
                style={{
                    width: `${(100 * total) / maxTotal}%`,
                    transition: "width 0.3s ease-in-out",
                }}></TableCell>
            <TableCell className="font-medium text-red-500">{price}</TableCell>
            <TableCell>{quantity}</TableCell>
            <TableCell className="text-right">{total?.toFixed(2)}</TableCell>
        </TableRow>
    );
}


/* 
export const AskTable = ({ asks }: { asks: [string, string][] }) => {
    let currentTotal = 0;
    const relevantAsks = asks.slice(0, 15);
    const asksWithTotal: [string, string, number][] = relevantAsks.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    asksWithTotal.reverse();
    const maxTotal = relevantAsks.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    return <div>
        {asksWithTotal.map(([price, quantity, total]) => Number(quantity)!=0 && <Ask maxTotal={maxTotal} key={price} price={price} quantity={quantity} total={total} />)}
    </div>
}
function Ask({price, quantity, total, maxTotal}: {price: string, quantity: string, total: number, maxTotal: number}) {
    return <div
    style={{
        display: "flex",
        position: "relative",
        width: "100%",
        backgroundColor: "transparent",
        overflow: "hidden",
    }}
>
    <div
        style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: `${(100 * total) / maxTotal}%`,
        height: "100%",
        background: "rgba(228, 75, 68, 0.325)",
        transition: "width 0.3s ease-in-out",
        }}
    ></div>
    <div className="flex justify-between text-xs w-full">
        <div>
            {price}
        </div>
        <div>
            {quantity}
        </div>
        <div>
            {total?.toFixed(2)}
        </div>
    </div>
    </div>
} */