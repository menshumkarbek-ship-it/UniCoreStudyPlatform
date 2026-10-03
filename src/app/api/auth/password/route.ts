import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, readJson, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "The new password must be at least 8 characters.").max(200),
});

// Changing the password signs out every other device by bumping token_version,
// then issues a fresh cookie so this device stays signed in.
export const PATCH = route(async (request) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = await readJson(request, passwordSchema);
  const row = await db.one<{ passwordHash: string }>(`SELECT password_hash AS "passwordHash" FROM users WHERE id = $1`, [user.id]);
  if (!row || !await verifyPassword(currentPassword, row.passwordHash)) throw new HttpError(400, "Your current password is incorrect.");
  if (currentPassword === newPassword) throw new HttpError(400, "Choose a password you have not just used.");
  const updated = await db.one<{ tokenVersion: number }>(`UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1 RETURNING token_version AS "tokenVersion"`, [user.id, await hashPassword(newPassword)]);
  await createSession(user.id, updated!.tokenVersion);
  return NextResponse.json({ ok: true });
});
