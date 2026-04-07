import { createLogger } from "@trading-platform/logger";
import { pgPool } from "./db";
import { RedisManager } from "./RedisManager";

const logger = createLogger("api");

export type HealthResponse = {
  statusCode: number;
  body: {
    status: "ok" | "error";
    service: "api";
    dependency?: "redis" | "postgres";
  };
};

export function getApiLiveness(): HealthResponse {
  return {
    statusCode: 200,
    body: {
      status: "ok",
      service: "api",
    },
  };
}

export async function getApiReadiness(): Promise<HealthResponse> {
  try {
    await pgPool.query("SELECT 1");
    if (!RedisManager.getInstance().isReady()) {
      return {
        statusCode: 503,
        body: {
          status: "error",
          service: "api",
          dependency: "redis",
        },
      };
    }

    return {
      statusCode: 200,
      body: {
        status: "ok",
        service: "api",
      },
    };
  } catch (error) {
    logger.error("API readiness check failed", error);
    return {
      statusCode: 503,
      body: {
        status: "error",
        service: "api",
        dependency: "postgres",
      },
    };
  }
}
