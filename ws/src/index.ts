import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager"; // UserManager class is a single instance , why? maybe because we only want a single object to manage for everyone, again why this?

const wss = new WebSocketServer({ port: 3001 });
wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

