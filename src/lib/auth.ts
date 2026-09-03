import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";

const sessionCookie = "tronsabak-session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-only-change-me");

export type Session = { userId: number; universityId: number; role: "student" | "professor" | "admin"; email: string; fullName: string };

export async function createSession(session: Session) {
  const token = await new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "number" || typeof payload.universityId !== "number" || typeof payload.email !== "string" || typeof payload.fullName !== "string" || !["student", "professor", "admin"].includes(String(payload.role))) return null;
    return { userId: payload.userId, universityId: payload.universityId, role: payload.role as Session["role"], email: payload.email, fullName: payload.fullName };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(sessionCookie);
}

export async function getAdminSession() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  const user = getDatabase().prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(session.userId);
  return user ? session : null;
}
