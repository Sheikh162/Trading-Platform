type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  message: string;
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const MARKET_PATTERN = /^[A-Z0-9]+_[A-Z0-9]+$/;
const ASSET_PATTERN = /^[A-Z0-9]+$/;

function ok<T>(data: T): ValidationSuccess<T> {
  return { success: true, data };
}

function fail(message: string): ValidationFailure {
  return { success: false, message };
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export function parseMarket(value: unknown, fieldName = "market"): ValidationResult<string> {
  const normalized = getString(value)?.toUpperCase();
  if (!normalized) {
    return fail(`${fieldName} is required`);
  }

  if (!MARKET_PATTERN.test(normalized)) {
    return fail(`${fieldName} must be in BASE_QUOTE format`);
  }

  return ok(normalized);
}

export function parseOptionalMarket(value: unknown): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === "") {
    return ok(undefined);
  }

  return parseMarket(value);
}

export function parseAsset(value: unknown, defaultAsset = "USDT"): ValidationResult<string> {
  const normalized = (getString(value) ?? defaultAsset).toUpperCase();
  if (!ASSET_PATTERN.test(normalized)) {
    return fail("asset must contain only letters and numbers");
  }

  return ok(normalized);
}

export function parseOrderSide(value: unknown): ValidationResult<"buy" | "sell"> {
  const side = getString(value)?.toLowerCase();
  if (side !== "buy" && side !== "sell") {
    return fail("side must be either 'buy' or 'sell'");
  }

  return ok(side);
}

export function parsePositiveNumberString(value: unknown, fieldName: string): ValidationResult<string> {
  const normalized = getString(value);
  if (!normalized) {
    return fail(`${fieldName} is required`);
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fail(`${fieldName} must be greater than zero`);
  }

  return ok(normalized);
}

export function parsePositiveNumber(value: unknown, fieldName: string): ValidationResult<number> {
  const numericValue =
    typeof value === "number" ? value : Number(getString(value));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fail(`${fieldName} must be greater than zero`);
  }

  return ok(numericValue);
}

export function parsePositiveInteger(
  value: unknown,
  fieldName: string,
  options?: { defaultValue?: number; min?: number; max?: number },
): ValidationResult<number> {
  if (value === undefined || value === null || value === "") {
    return ok(options?.defaultValue ?? 1);
  }

  const numericValue = Number(getString(value));
  if (!Number.isInteger(numericValue)) {
    return fail(`${fieldName} must be an integer`);
  }

  const min = options?.min ?? 1;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  if (numericValue < min || numericValue > max) {
    return fail(`${fieldName} must be between ${min} and ${max}`);
  }

  return ok(numericValue);
}

export function parseRequiredString(value: unknown, fieldName: string): ValidationResult<string> {
  const normalized = getString(value);
  if (!normalized) {
    return fail(`${fieldName} is required`);
  }

  return ok(normalized);
}

export function parseOptionalString(value: unknown): string | undefined {
  return getString(value) || undefined;
}

export function parseKlineInterval(value: unknown): ValidationResult<"1m" | "1h" | "1w"> {
  const interval = getString(value);
  if (interval === "1m" || interval === "1h" || interval === "1w") {
    return ok(interval);
  }

  return fail("interval must be one of 1m, 1h, or 1w");
}

export function parseUnixTimestampSeconds(value: unknown, fieldName: string): ValidationResult<number> {
  const numericValue = Number(getString(value));
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fail(`${fieldName} must be a valid unix timestamp in seconds`);
  }

  return ok(numericValue);
}

export function parseKlineWindow(
  startTime: unknown,
  endTime: unknown,
): ValidationResult<{ startTime: number; endTime: number }> {
  const parsedStart = parseUnixTimestampSeconds(startTime, "startTime");
  if (!parsedStart.success) {
    return parsedStart;
  }

  const parsedEnd = parseUnixTimestampSeconds(endTime, "endTime");
  if (!parsedEnd.success) {
    return parsedEnd;
  }

  if (parsedEnd.data <= parsedStart.data) {
    return fail("endTime must be greater than startTime");
  }

  return ok({
    startTime: parsedStart.data,
    endTime: parsedEnd.data,
  });
}
