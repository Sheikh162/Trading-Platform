import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const envFile = path.join(rootDir, ".env");

function readRootEnv() {
  const values = {};

  if (!fs.existsSync(envFile)) {
    return values;
  }

  for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function waitForPort(host, port, label, timeoutMs = 60_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        console.log(`[infra] ${label} is reachable on ${host}:${port}`);
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error(
              `${label} did not become reachable on ${host}:${port} within ${timeoutMs}ms`,
            ),
          );
          return;
        }

        setTimeout(attempt, 1_000);
      });
    };

    attempt();
  });
}

async function main() {
  const env = readRootEnv();
  const postgresPort = Number(env.TIMESCALE_PORT || "5432");
  const redisPort = Number(env.REDIS_PORT || "6379");

  await waitForPort("127.0.0.1", postgresPort, "TimescaleDB");
  await waitForPort("127.0.0.1", redisPort, "Redis");
}

main().catch((error) => {
  console.error("[infra] bootstrap failed:", error);
  process.exit(1);
});
