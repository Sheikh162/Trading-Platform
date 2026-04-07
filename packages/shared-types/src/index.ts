export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const WITHDRAW = "WITHDRAW";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_BALANCE = "GET_BALANCE";
export const GET_DEPTH = "GET_DEPTH";
export const USER_CREATED = "USER_CREATED";

export const TRADE_ADDED = "TRADE_ADDED";
export const ORDER_UPDATE = "ORDER_UPDATE";

export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";

export type OrderSide = "buy" | "sell";
export type OrderStatus =
  | "open"
  | "partially_filled"
  | "filled"
  | "cancelled"
  | "rejected";

export interface OpenOrder {
  price: number;
  quantity: number;
  orderId: string;
  filled: number;
  side: OrderSide;
  userId: string;
}

export interface Fill {
  price: string;
  qty: number;
  tradeId: number;
  otherUserId: string;
  markerOrderId: string;
}

export type MessageToEngine =
  | {
      type: typeof USER_CREATED;
      data: {
        userId: string;
      };
    }
  | {
      type: typeof CREATE_ORDER;
      data: {
        market: string;
        price: string;
        quantity: string;
        side: OrderSide;
        userId: string;
      };
    }
  | {
      type: typeof CANCEL_ORDER;
      data: {
        orderId: string;
        market: string;
      };
    }
  | {
      type: typeof ON_RAMP;
      data: {
        amount: string;
        userId: string;
        txnId: string;
      };
    }
  | {
      type: typeof WITHDRAW;
      data: {
        amount: string;
        userId: string;
      };
    }
  | {
      type: typeof GET_DEPTH;
      data: {
        market: string;
      };
    }
  | {
      type: typeof GET_OPEN_ORDERS;
      data: {
        userId: string;
        market: string;
      };
    }
  | {
      type: typeof GET_BALANCE;
      data: {
        userId: string;
      };
    };

export type MessageFromEngine =
  | {
      type: "USER_CREATED";
      payload: {
        userId: string;
      };
    }
  | {
      type: "DEPTH";
      payload: {
        market?: string;
        bids: [string, string][];
        asks: [string, string][];
      };
    }
  | {
      type: "ORDER_PLACED";
      payload: {
        orderId: string;
        executedQty: number;
        fills: Array<{
          price: string;
          qty: number;
          tradeId: number;
        }>;
      };
    }
  | {
      type: "ORDER_CANCELLED";
      payload: {
        orderId: string;
        executedQty: number;
        remainingQty: number;
      };
    }
  | {
      type: "OPEN_ORDERS";
      payload: OpenOrder[];
    }
  | {
      type: "GET_BALANCE";
      payload: {
        balance: string;
      };
    };

export type DbMessage =
  | {
      type: typeof TRADE_ADDED;
      data: {
        id: string;
        isBuyerMaker: boolean;
        price: string;
        quantity: string;
        quoteQuantity: string;
        timestamp: number;
        market: string;
        makerOrderId: string;
        takerOrderId: string;
        makerUserId: string;
        takerUserId: string;
        buyerUserId: string;
        sellerUserId: string;
      };
    }
  | {
      type: typeof ORDER_UPDATE;
      data: {
        orderId: string;
        executedQty?: number;
        market?: string;
        price?: string;
        quantity?: string;
        side?: OrderSide;
        userId?: string;
        status?: OrderStatus;
      };
    };

export type TickerUpdateMessage = {
  stream: string;
  data: {
    c?: string;
    h?: string;
    l?: string;
    v?: string;
    V?: string;
    s?: string;
    e: "ticker";
  };
};

export type DepthUpdateMessage = {
  stream: string;
  data: {
    b?: [string, string][];
    a?: [string, string][];
    e: "depth";
  };
};

export type TradeAddedMessage = {
  stream: string;
  data: {
    e: "trade";
    t: number;
    m: boolean;
    p: string;
    q: string;
    s: string;
  };
};

export type WsPublishMessage =
  | TickerUpdateMessage
  | DepthUpdateMessage
  | TradeAddedMessage;

export type SubscribeMessage = {
  method: typeof SUBSCRIBE;
  params: string[];
};

export type UnsubscribeMessage = {
  method: typeof UNSUBSCRIBE;
  params: string[];
};

export type WsIncomingMessage = SubscribeMessage | UnsubscribeMessage;

export type WsOutgoingMessage =
  | {
      type: "ticker";
      data: TickerUpdateMessage["data"] & { id: number };
    }
  | {
      type: "depth";
      data: DepthUpdateMessage["data"] & { id: number };
    };
