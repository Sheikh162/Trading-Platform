import { getRedisUrl } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";
import http from "node:http";
import { createClient, } from "redis";
import { Engine } from "./trade/Engine";

const logger = createLogger("engine");
let ready = false;
let shuttingDown = false;

async function main() {
    const engine = new Engine(); 
    await engine.hydrateFromDb();
    const redisClient = createClient({ url: getRedisUrl() });
    await redisClient.connect();
    ready = true;
    logger.info("Engine connected to Redis and ready");

    const healthPort = Number(process.env.HEALTH_PORT || 8082);
    const healthServer = http.createServer((req, res) => {
        if (req.url !== "/healthz" && req.url !== "/readyz") {
            res.writeHead(404);
            res.end();
            return;
        }

        const statusCode = ready && !shuttingDown ? 200 : 503;
        res.writeHead(statusCode, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                status: statusCode === 200 ? "ok" : "error",
                service: "engine",
            }),
        );
    });

    healthServer.listen(healthPort, () => {
        logger.info("Engine health server listening", { port: healthPort });
    });

    const shutdown = async (signal: string) => {
        shuttingDown = true;
        ready = false;
        logger.info("Shutting down engine", { signal });
        engine.close();
        await healthServer.closeAllConnections?.();
        await new Promise<void>((resolve, reject) => {
            healthServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        await redisClient.quit();
        process.exit(0);
    };

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, () => {
            shutdown(signal).catch((error) => {
                logger.error("Engine shutdown failed", error);
                process.exit(1);
            });
        });
    }
//messaging queue sends the ordes in fifo manner, synchronous
    while (!shuttingDown) {
        const response = await redisClient.rPop("messages" as string) // lpush done from sendandawait in api fn
        if (!response) {

        }  else {
            engine.process(JSON.parse(response));  // response structure {clientId,message}
        }        
    }

}

main().catch((error) => {
    logger.error("Engine startup failed", error);
    process.exit(1);
});
