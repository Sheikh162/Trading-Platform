import { WebSocket } from "ws";
import { User } from "./User";
import { SubscriptionManager } from "./SubscriptionManager";

export class UserManager {
    private static instance: UserManager;
    private users: Map<string, User> = new Map(); 

    private constructor() {
    }

    public static getInstance() {
        if (!this.instance)  {
            this.instance = new UserManager();
        }
        return this.instance;
    }

    public addUser(ws: WebSocket) {
        const id = this.getRandomId();
        const user = new User(id, ws); // just a user defined datatype used to store id,ws
        this.users.set(id, user);
        this.registerOnClose(ws, id); // since added users, also need to make sure when disconnects, eventlistenr is called
        return user;
    }

    private registerOnClose(ws: WebSocket, id: string) {
        ws.on("close", () => {
            this.users.delete(id); // delete that userids key value pair from map
            SubscriptionManager.getInstance().userLeft(id); // whenever connection closed, need to remove rooms or unsubscribe from pubsub
        });
    }

    public getUser(id: string) {
        return this.users.get(id);
    }

    private getRandomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

