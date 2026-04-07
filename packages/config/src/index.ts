export type EnvOptions = {
  defaultValue?: string;
  required?: boolean;
};

export type NumberEnvOptions = {
  defaultValue?: number;
  required?: boolean;
};

export function getEnv(name: string, options: EnvOptions = {}): string {
  const value = process.env[name];

  if (value !== undefined && value !== "") {
    return value;
  }

  if (options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  if (options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return "";
}

export function getNumberEnv(
  name: string,
  options: NumberEnvOptions = {},
): number {
  const rawValue = process.env[name];

  if (rawValue !== undefined && rawValue !== "") {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${name} must be a number`);
    }
    return parsed;
  }

  if (options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  if (options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return 0;
}

export function getRedisUrl(): string {
  const explicitUrl = process.env.REDIS_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const host = getEnv("REDIS_HOST", { defaultValue: "localhost" });
  const port = getNumberEnv("REDIS_PORT", { defaultValue: 6379 });
  return `redis://${host}:${port}`;
}

export function getPostgresConfig() {
  return {
    user: getEnv("POSTGRES_USER", { required: true }),
    host: getEnv("POSTGRES_HOST", { defaultValue: "localhost" }),
    database: getEnv("POSTGRES_DB", { required: true }),
    password: getEnv("POSTGRES_PASSWORD", { required: true }),
    port: getNumberEnv("POSTGRES_PORT", { defaultValue: 5432 }),
  };
}
