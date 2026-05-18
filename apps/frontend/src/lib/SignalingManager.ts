import { Ticker,Depth } from "./types";

// type for recieved data is below
/* 
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [],
                    e: "depth"
                }
            });
*/
type callbackType={
    id:string,
    callback:(data:Partial<Ticker|Depth>)=>void
}

//export const BASE_URL = "wss://ws.backpack.exchange/"
export const BASE_URL = process.env.NEXT_PUBLIC_WS_URL||"ws://localhost:3001/"  // this where your websocket server is located

export class SignalingManager {
    private ws: WebSocket | null = null;
    private static instance: SignalingManager;
    private bufferedMessages: any[] = [];
    private callbacks: any = {}; // an object, whose key is the type i.e depth, value is array of objects
    private id: number;
    private initialized: boolean = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_DELAY = 10000; // Max 10 seconds

    private constructor() {
        this.id = 1;
        this.connect();
    }

    public static getInstance() { // singleton pattern so only a instance exists
        if (!this.instance)  {
            this.instance = new SignalingManager();
        }
        return this.instance;
    }

    private connect() {
        if (this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(BASE_URL);
            this.init();
        } catch (error) {
            console.error("Failed to initiate WebSocket connection:", error);
            this.handleReconnect();
        }
    }

    private handleReconnect() {
        this.initialized = false;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.MAX_RECONNECT_DELAY);
        console.log(`WebSocket disconnected. Reconnecting in ${delay}ms...`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    private resubscribeAll() {
        // Extract unique market IDs from registered callbacks to resubscribe
        const activeSubscriptions = new Set<string>();
        
        Object.keys(this.callbacks).forEach(type => {
            this.callbacks[type].forEach(({ id }: callbackType) => {
                 if (type === "ticker") activeSubscriptions.add(`ticker@${id}`);
                 if (type === "depth") activeSubscriptions.add(`depth@${id}`);
                 if (type === "trade") activeSubscriptions.add(`trade@${id}`);
            });
        });

        if (activeSubscriptions.size > 0) {
            this.sendMessage({
                method: "SUBSCRIBE",
                params: Array.from(activeSubscriptions)
            });
        }
    }

    init() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log("WebSocket connected.");
            this.initialized = true;
            this.reconnectAttempts = 0;
            
            // Resend any messages that were buffered during disconnect
            this.bufferedMessages.forEach(message => {
                this.ws?.send(JSON.stringify(message));
            });
            this.bufferedMessages = [];

            // Resubscribe to active channels if this is a reconnect
            this.resubscribeAll();
        }

        this.ws.onclose = () => {
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error observed:", error);
            // close will follow error
        };

        this.ws.onmessage = (event) => {
            try {
                const message:any = JSON.parse(event.data);
                const type = message.data?.e; // ticker, depth etc
                if (type && this.callbacks[type]) { 
                    this.callbacks[type].forEach(({ callback }:callbackType) => {
                        if (type === "ticker") {
                            const newTicker: Partial<Ticker> = {
                                lastPrice: message.data.c,
                                high: message.data.h,
                                low: message.data.l,
                                volume: message.data.v,
                                quoteVolume: message.data.V,
                                symbol: message.data.s,
                            }

                            callback(newTicker);
                       }
                       if (type === "depth") {
                            const updatedBids = message.data.b;
                            const updatedAsks = message.data.a;
                            callback({ bids: updatedBids, asks: updatedAsks });
                        }
                    });
                }
            } catch (e) {
                console.error("Error processing WebSocket message:", e);
            }
        }
    }

    sendMessage(message: any) { // code to subscribe/unsubscribe to a channel in pubsub via websocket server
        const messageToSend = {
            ...message,
            id: this.id++
        }
        if (!this.initialized || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.bufferedMessages.push(messageToSend);
            return;
        }
        this.ws.send(JSON.stringify(messageToSend));
    }

    async registerCallback(type: string, callback: any, id: string) { // here id means market, change it for better readability
        this.callbacks[type] = this.callbacks[type] || []; // if for example callbacks[depth] doesnt exists, create it
        this.callbacks[type].push({ callback, id }); // callbacks is an object, whose key is the type i.e depth, value is array of objects
        // "ticker" => callback
    }

    async deRegisterCallback(type: string, id: string) {
        if (this.callbacks[type]) {
            const index = this.callbacks[type].findIndex((element:callbackType) => element.id === id);
            if (index !== -1) {
                this.callbacks[type].splice(index, 1);
            }
        }
    }
}