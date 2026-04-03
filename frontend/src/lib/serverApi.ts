const API_BASE_URL =
  process.env.HTTP_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || "";

export async function serverFetch<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST";
    token?: string | null;
    body?: Record<string, unknown>;
  },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${endpoint}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
