
export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_BALANCE="GET_BALANCE"
export const GET_DEPTH = "GET_DEPTH";

// instead of union something else is more optimal
//TODO: can u make the type of the response object right? Right now it is a union.  check in fromApi file in engine folder 

export type MessageFromOrderbook = {
    type: "DEPTH",
    payload: {
        market: string,
        bids: [string, string][],
        asks: [string, string][],
    }
} | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: number,
        fills: [
            {
                price: string,
                qty: number,
                tradeId: number
            }
        ]
    }
} | {
    type: "ORDER_CANCELLED",
    payload: {
        orderId: string,
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "OPEN_ORDERS",
    payload: {
        orderId: string,
        executedQty: number,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }[]
}|{
    type: "GET_BALANCE",
    payload: {
        // orderId: string,
        // executedQty: number,
        // price: string,
        // quantity: string,
        // side: "buy" | "sell",
        // userId: string
        balance: string
    }[]
}