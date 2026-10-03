import "server-only";

import { cache } from "react";
import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

export type Role = "admin" | "professor" | "student";

export type SessionUser = {
  id: number;
  role: Role;
  universityId: number | null;
  universityName: string | null;
  universityCity: string | null;
  timezone: string;
  email: string;
  fullName: string;
  studentNumber: string | null;
  photoUrl: string | null;
};

const sessionCookie = "unicore-session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;
const defaultTimezone = "Asia/Bishkek";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set to at least 32 random characters in production.");
  return new TextEncoder().encode("development-only-secret-do-not-use-in-production");
}

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

/**
 * Signs a session for the user and returns the token. Browsers get it as an httpOnly cookie; native apps pass
 * `cookie: false` and send the returned token back as `Authorization: Bearer <token>`.
 */
export async function createSession(userId: number, tokenVersion: number, { cookie = true }: { cookie?: boolean } = {}) {
  const token = await new SignJWT({ v: tokenVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId)).setJti(randomUUID()).setIssuedAt().setExpirationTime(`${sessionMaxAgeSeconds}s`).sign(secretKey());
  if (cookie) (await cookies()).set(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionMaxAgeSeconds });
  return token;
}

export const sessionLifetimeSeconds = sessionMaxAgeSeconds;

/** True when the request authenticates with a bearer token (a native app) rather than the session cookie. */
export function isBearerRequest(request: Request) {
  return /^Bearer\s+\S/i.test(request.headers.get("authorization") ?? "");
}

/** The session token of the current request: the `Authorization: Bearer` header if present, otherwise the cookie. */
async function requestToken() {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return bearer ?? (await cookies()).get(sessionCookie)?.value;
}

/** Ends the current session for good: the cookie is removed and its id is blacklisted until the token would have expired. */
export async function revokeCurrentSession() {
  const token = await requestToken();
  const payload = token ? await jwtVerify(token, secretKey(), { algorithms: ["HS256"] }).then((verified) => verified.payload, () => null) : null;
  if (payload?.jti && payload.exp) {
    try {
      await db.run("INSERT INTO revoked_sessions (jti, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING", [payload.jti, payload.exp]);
      // Opportunistic cleanup keeps the table small without a cron job.
      if (Math.random() < 0.05) await db.run("DELETE FROM revoked_sessions WHERE expires_at < now()");
    } catch (error) {
      // Signing out on this device must still work while the database is unavailable.
      console.error("[auth] could not record sign-out:", error instanceof Error ? error.message : error);
    }
  }
  await clearSession();
}

export async function clearSession() {
  (await cookies()).delete(sessionCookie);
}

/** The signed-in user, re-read from the database on every request so deleted or rotated accounts lose access at once. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await requestToken();
  if (!token) return null;
  let userId: number;
  let tokenVersion: number;
  let jti = "";
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    userId = Number(payload.sub);
    tokenVersion = Number(payload.v);
    jti = typeof payload.jti === "string" ? payload.jti : "";
    if (!Number.isInteger(userId) || !Number.isInteger(tokenVersion)) return null;
  } catch {
    return null;
  }
  const user = await db.one<Omit<SessionUser, "photoUrl"> & { tokenVersion: number; photoPath: string | null }>(
    `SELECT u.id, u.role, u.university_id AS "universityId", un.name AS "universityName", un.city AS "universityCity", COALESCE(un.timezone, $2) AS timezone,
            u.email, u.full_name AS "fullName", u.student_number AS "studentNumber", u.photo_path AS "photoPath", u.token_version AS "tokenVersion"
       FROM users u LEFT JOIN universities un ON un.id = u.university_id
      WHERE u.id = $1 AND NOT EXISTS (SELECT 1 FROM revoked_sessions r WHERE r.jti = $3)`,
    [userId, defaultTimezone, jti],
  );
  if (!user) return null;
  const { tokenVersion: currentVersion, photoPath, ...sessionUser } = user;
  if (currentVersion !== tokenVersion) return null;
  // The stored file name changes on every upload, so it doubles as a cache-busting version.
  const photoUrl = photoPath ? `/api/users/${user.id}/photo?v=${photoPath.split("/").pop()?.split(".")[0]}` : null;
  return { ...sessionUser, photoUrl };
});
