import "dotenv/config";
import { createLogger } from "@trading-platform/logger";
import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const logger = createLogger("ws-gateway");
const wss = new WebSocketServer({ port: Number(process.env.PORT) });
logger.info("WebSocket gateway listening", { port: process.env.PORT });
wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});
