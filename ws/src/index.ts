import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const wss = new WebSocketServer({ port: Number(process.env.PORT) });
wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

