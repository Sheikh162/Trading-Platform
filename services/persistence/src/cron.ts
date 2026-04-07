import { Client } from 'pg'; 
import http from "node:http";
import { getPostgresConfig } from "@trading-platform/config";
import { createLogger } from "@trading-platform/logger";

const logger = createLogger("persistence-cron");
const client = new Client(getPostgresConfig());
let refreshTimer: NodeJS.Timeout | null = null;
let ready = false;
let shuttingDown = false;

async function connectToDatabase() {
    try {
        await client.connect();
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error("Failed to connect to PostgreSQL", error);
        process.exit(1);
    }
}

async function refreshViews() {
    try {
        const startTime = new Date();
        logger.info("Starting materialized view refresh", { startedAt: startTime.toISOString() });
        
        await client.query('REFRESH MATERIALIZED VIEW klines_1m');
        
        await client.query('REFRESH MATERIALIZED VIEW klines_1h');
        
        await client.query('REFRESH MATERIALIZED VIEW klines_1w');
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        logger.info("Materialized views refreshed", { durationMs: duration });
        
    } catch (error) {
        logger.error("Error refreshing materialized views", error);
    }
}

async function main() {
    logger.info("Starting cron job for materialized view refresh");
    await connectToDatabase();
    
    await refreshViews();
    ready = true;

    const healthPort = Number(process.env.HEALTH_PORT || 8084);
    const healthServer = http.createServer((req, res) => {
        if (req.url !== "/healthz" && req.url !== "/readyz") {
            res.writeHead(404);
            res.end();
            return;
        }

        const statusCode = ready && !shuttingDown ? 200 : 503;
        res.writeHead(statusCode, { "content-type": "application/json" });
        res.end(JSON.stringify({
            status: statusCode === 200 ? "ok" : "error",
            service: "persistence-cron",
        }));
    });

    healthServer.listen(healthPort, () => {
        logger.info("Persistence cron health server listening", { port: healthPort });
    });
    
    refreshTimer = setInterval(() => {
        refreshViews();
    }, 1000 * 10);

    const shutdown = async (signal: string) => {
        shuttingDown = true;
        ready = false;
        logger.info("Shutting down persistence cron", { signal });
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
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
        await client.end();
        process.exit(0);
    };

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, () => {
            shutdown(signal).catch((error) => {
                logger.error("Persistence cron shutdown failed", error);
                process.exit(1);
            });
        });
    }
}

main().catch((error) => {
    logger.error("Persistence cron failed", error);
    process.exit(1);
});
