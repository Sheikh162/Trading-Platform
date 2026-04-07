import { getPostgresConfig } from "@trading-platform/config";
import { Pool } from "pg";

export const pgPool = new Pool(getPostgresConfig());

export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type Queryable = Pick<Pool, "query"> | Pick<import("pg").PoolClient, "query">;

export async function ensureUserExists(
  db: Queryable,
  userId: string,
  email?: string | null,
): Promise<void> {
  await db.query(
    `
      INSERT INTO users (id, email)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
      SET email = COALESCE(users.email, EXCLUDED.email)
    `,
    [userId, email ?? null],
  );
}
