import "server-only";

import pg from "pg";

// Return values the UI can use directly instead of pg's defaults:
// bigint/count -> number, date -> "YYYY-MM-DD", time -> "HH:MM", timestamptz -> ISO string.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
pg.types.setTypeParser(pg.types.builtins.TIME, (value) => value.slice(0, 5));
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => new Date(value).toISOString());

type Queryable = pg.Pool | pg.PoolClient;
const globalForDatabase = globalThis as typeof globalThis & { unicorePool?: pg.Pool };

function getPool() {
  if (!globalForDatabase.unicorePool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      // Fail fast instead of hanging when the database is unreachable or every connection is busy.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      // A runaway query or a long lock wait is cancelled instead of holding a request open forever.
      statement_timeout: 15_000,
      query_timeout: 20_000,
    });
    // A connection dropped while idle (database restart, failover, network) is reported here. Without a
    // listener Node treats it as an uncaught exception, which can take the whole server down.
    pool.on("error", (error) => console.error("[db] idle connection lost:", error.message));
    globalForDatabase.unicorePool = pool;
  }
  return globalForDatabase.unicorePool;
}

export type Db = {
  many<T>(text: string, params?: unknown[]): Promise<T[]>;
  one<T>(text: string, params?: unknown[]): Promise<T | undefined>;
  run(text: string, params?: unknown[]): Promise<number>;
};

async function many<T>(text: string, params: unknown[] = [], client: Queryable = getPool()): Promise<T[]> {
  return (await client.query(text, params)).rows as T[];
}

async function one<T>(text: string, params: unknown[] = [], client: Queryable = getPool()): Promise<T | undefined> {
  return (await client.query(text, params)).rows[0] as T | undefined;
}

async function run(text: string, params: unknown[] = [], client: Queryable = getPool()): Promise<number> {
  return (await client.query(text, params)).rowCount ?? 0;
}

export const db: Db = {
  many: <T,>(text: string, params: unknown[] = []) => many<T>(text, params),
  one: <T,>(text: string, params: unknown[] = []) => one<T>(text, params),
  run: (text: string, params: unknown[] = []) => run(text, params),
};

/** Runs `work` in a transaction; the callback's queries go through the same connection. */
export async function transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const tx: Db = {
    many: <T,>(text: string, params: unknown[] = []) => many<T>(text, params, client),
    one: <T,>(text: string, params: unknown[] = []) => one<T>(text, params, client),
    run: (text: string, params: unknown[] = []) => run(text, params, client),
  };
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await work(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // If even ROLLBACK fails the connection itself is dead; it must not go back into the pool.
    await client.query("ROLLBACK").catch(() => { broken = true; });
    throw error;
  } finally {
    client.release(broken);
  }
}

const unavailableCodes = new Set([
  "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EPIPE", "EAI_AGAIN",
  "57P01", "57P02", "57P03", "53300", "57014", "08000", "08001", "08003", "08004", "08006",
]);

/** True when the database is down, unreachable, overloaded, or a query timed out (a temporary condition, not a bug). */
export function isDatabaseUnavailable(error: unknown): boolean {
  const code = databaseErrorCode(error);
  if (code && unavailableCodes.has(code)) return true;
  const message = error instanceof Error ? error.message : "";
  return /timeout exceeded when trying to connect|Connection terminated|Query read timeout|connect ECONNREFUSED/i.test(message);
}

/** Postgres error code (e.g. 23505 unique_violation), if the error came from the database. */
export function databaseErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
}
