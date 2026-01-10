import {Table,TableBody, TableRow, TableCell } from "@/src/components/ui/table";

export const BidTable = ({ bids }: { bids: [string, string][] }) => {
    let currentTotal = 0;
    const relevantBids = bids.slice(0, 15);
    const bidsWithTotal: [string, string, number][] = relevantBids.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    const maxTotal = relevantBids.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    return (
        <Table>
            <TableBody>
                {bidsWithTotal?.map(([price, quantity, total]) => (
                    Number(quantity) !== 0 && <BidRow maxTotal={maxTotal} total={total} key={price} price={price} quantity={quantity} />
                ))}
            </TableBody>
        </Table>
    );
}

function BidRow({ price, quantity, total, maxTotal }: { price: string, quantity: string, total: number, maxTotal: number }) {
    return (
        <TableRow className="relative">
            <TableCell className="absolute top-0 right-0 h-full bg-green-500/20"
                style={{
                    width: `${(100 * total) / maxTotal}%`,
                    transition: "width 0.3s ease-in-out",
                }}></TableCell>
            <TableCell className="w-[100px] font-medium text-green-500">{price}</TableCell>
            <TableCell>{quantity}</TableCell>
            <TableCell className="text-right">{total.toFixed(2)}</TableCell>
        </TableRow>
    );
}

/* 
export const BidTable = ({ bids }: {bids: [string, string][]}) => {
    let currentTotal = 0; 
    const relevantBids = bids.slice(0, 15);
    const bidsWithTotal: [string, string, number][] = relevantBids.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    const maxTotal = relevantBids.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    return <div>
        {bidsWithTotal?.map(([price, quantity, total]) => Number(quantity)!=0 && <Bid maxTotal={maxTotal} total={total} key={price} price={price} quantity={quantity} />)}
    </div>
}

function Bid({ price, quantity, total, maxTotal }: { price: string, quantity: string, total: number, maxTotal: number }) {
    return (
        <div
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
            background: "rgba(1, 167, 129, 0.325)",
            transition: "width 0.3s ease-in-out",
            }}
        ></div>
            <div className={`flex justify-between text-xs w-full`}>
                <div>
                    {price}
                </div>
                <div>
                    {quantity}
                </div>
                <div>
                    {total.toFixed(2)}
                </div>
            </div>
        </div>
    );
}
 */