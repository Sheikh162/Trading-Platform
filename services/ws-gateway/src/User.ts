import { WebSocket } from "ws";
import {
  SUBSCRIBE,
  UNSUBSCRIBE,
  WsIncomingMessage,
  WsOutgoingMessage,
} from "@trading-platform/shared-types";
import { SubscriptionManager } from "./SubscriptionManager";

export class User {
    private id: string;
    private ws: WebSocket;

    constructor(id: string, ws: WebSocket) {
        this.id = id;
        this.ws = ws;
        this.addListeners();
    }

    emit(message: WsOutgoingMessage) {
        this.ws.send(JSON.stringify(message));
    }

    private addListeners() {
        this.ws.on("message", (message: string) => {
            const parsedMessage: WsIncomingMessage = JSON.parse(message);
            if (parsedMessage.method === SUBSCRIBE) {
                parsedMessage.params.forEach(s => SubscriptionManager.getInstance().subscribe(this.id, s));
            }

            if (parsedMessage.method === UNSUBSCRIBE) {
                parsedMessage.params.forEach(s => SubscriptionManager.getInstance().unsubscribe(this.id, s));
            }
        });
    }

}
