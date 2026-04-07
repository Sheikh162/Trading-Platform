type LogLevel = "debug" | "info" | "warn" | "error";

function normalizeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }

  return meta;
}

function write(level: LogLevel, service: string, message: string, meta?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(meta !== undefined ? { meta: normalizeMeta(meta) } : {}),
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

export function createLogger(service: string) {
  return {
    debug(message: string, meta?: unknown) {
      write("debug", service, message, meta);
    },
    info(message: string, meta?: unknown) {
      write("info", service, message, meta);
    },
    warn(message: string, meta?: unknown) {
      write("warn", service, message, meta);
    },
    error(message: string, meta?: unknown) {
      write("error", service, message, meta);
    },
  };
}
