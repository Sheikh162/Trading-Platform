import "dotenv/config";
import { getNumberEnv } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import http from "node:http";
import { WebSocketServer } from "ws";
import { SubscriptionManager } from "./SubscriptionManager";
import { UserManager } from "./UserManager";

const logger = createLogger("ws-gateway");
const port = getNumberEnv("PORT", { defaultValue: 3001 });

const server = http.createServer((req, res) => {
    if (req.url === "/healthz") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "ws-gateway" }));
        return;
    }

    if (req.url === "/readyz") {
        const ready = SubscriptionManager.getInstance().isReady();
        res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                status: ready ? "ok" : "error",
                service: "ws-gateway",
                activeUsers: UserManager.getInstance().activeUserCount(),
            }),
        );
        return;
    }

    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});

server.listen(port, () => {
    logger.info("WebSocket gateway listening", { port });
});

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

const shutdown = async (signal: string) => {
    logger.info("Shutting down WebSocket gateway", { signal });
    UserManager.getInstance().disconnectAll();
    await SubscriptionManager.getInstance().close();
    await new Promise<void>((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
    wss.close();
    process.exit(0);
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        shutdown(signal).catch((error) => {
            logger.error("WebSocket gateway shutdown failed", error);
            process.exit(1);
        });
    });
}
