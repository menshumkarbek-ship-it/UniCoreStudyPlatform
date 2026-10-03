import "server-only";

import { db } from "@/lib/db";

/** True when `bucket` already has `limit` failures inside the last `windowSeconds`. */
export async function isRateLimited(bucket: string, limit: number, windowSeconds: number) {
  const row = await db.one<{ count: number }>("SELECT COUNT(*) AS count FROM rate_limit_events WHERE bucket = $1 AND created_at > now() - make_interval(secs => $2)", [bucket, windowSeconds]);
  return (row?.count ?? 0) >= limit;
}

export async function recordFailure(bucket: string) {
  await db.run("INSERT INTO rate_limit_events (bucket) VALUES ($1)", [bucket]);
  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.02) await db.run("DELETE FROM rate_limit_events WHERE created_at < now() - interval '1 day'");
}

export async function clearFailures(bucket: string) {
  await db.run("DELETE FROM rate_limit_events WHERE bucket = $1", [bucket]);
}
