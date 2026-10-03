import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, sessionLifetimeSeconds, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, idSchema, readJson, route } from "@/lib/http";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  role: z.enum(["student", "professor", "admin"]),
  universityId: idSchema.optional(),
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(200),
  // Native apps send "mobile" to receive the session token in the response instead of a cookie.
  client: z.enum(["web", "mobile"]).optional(),
});

// Compared against when the account does not exist, so response time does not reveal which accounts exist.
let dummyHash: Promise<string> | undefined;

export const POST = route(async (request) => {
  const { role, universityId, identifier, password, client } = await readJson(request, loginSchema);
  if (role !== "admin" && !universityId) throw new HttpError(400, "Choose your university.");
  const bucket = `login:${role}:${universityId ?? "platform"}:${identifier.toLowerCase()}`;
  // Also throttle by client address (when a reverse proxy supplies it), so one machine cannot spray guesses across many accounts. The limit is generous because a campus can share one public address.
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipBucket = clientIp ? `login-ip:${clientIp}` : null;
  if (await isRateLimited(bucket, 8, 15 * 60) || (ipBucket && await isRateLimited(ipBucket, 150, 15 * 60))) throw new HttpError(429, "Too many failed attempts. Try again in 15 minutes.");

  const user = role === "admin"
    ? await db.one<{ id: number; passwordHash: string; tokenVersion: number }>(`SELECT id, password_hash AS "passwordHash", token_version AS "tokenVersion" FROM users WHERE role = 'admin' AND email = $1`, [identifier.toLowerCase()])
    : await db.one<{ id: number; passwordHash: string; tokenVersion: number }>(
      `SELECT id, password_hash AS "passwordHash", token_version AS "tokenVersion" FROM users
        WHERE university_id = $1 AND role = $2 AND (email = lower($3) OR (role = 'student' AND student_number = $3))`,
      [universityId, role, identifier],
    );

  dummyHash ??= hashPassword(randomUUID());
  const valid = await verifyPassword(password, user?.passwordHash ?? await dummyHash);
  if (!user || !valid) {
    await recordFailure(bucket);
    if (ipBucket) await recordFailure(ipBucket);
    throw new HttpError(401, role === "admin" ? "Those administrator credentials are incorrect." : "Those credentials do not match this university and role.");
  }
  await clearFailures(bucket);
  const mobile = client === "mobile";
  const token = await createSession(user.id, user.tokenVersion, { cookie: !mobile });
  return NextResponse.json({ role, redirectTo: role === "admin" ? "/admin" : "/dashboard", ...(mobile && { token, expiresIn: sessionLifetimeSeconds }) });
});
