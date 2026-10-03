import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, type Role, type SessionUser } from "@/lib/auth";
import { databaseErrorCode, isDatabaseUnavailable } from "@/lib/db";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// Friendly messages for the unique indexes a user can realistically hit.
const uniqueMessages: Record<string, string> = {
  universities_name_key: "A university with this name already exists.",
  faculties_university_name_key: "This university already has a faculty with that name.",
  groups_university_name_key: "This university already has a group with that name.",
  users_university_email_key: "Someone at this university already uses that email.",
  users_admin_email_key: "An administrator already uses that email.",
  users_university_student_number_key: "Another student at this university already has that student number.",
  courses_university_code_key: "This university already has a subject with that code.",
  course_groups_pkey: "That group already takes this subject.",
};

function databaseErrorResponse(error: unknown) {
  const code = databaseErrorCode(error);
  const details = error as { constraint?: string; detail?: string };
  if (code === "23505") return jsonError(409, uniqueMessages[details.constraint ?? ""] ?? "That record already exists.");
  if (code === "23503") return jsonError(409, details.detail?.includes("is still referenced") ? "This record is still used elsewhere. Remove the records that depend on it first." : "A related record no longer exists.");
  if (code === "23514" || code === "22P02" || code === "22007" || code === "22008" || code === "22003" || code === "22001") return jsonError(400, "Some values are not valid.");
  // NUL characters and invalid UTF-8 cannot be stored in Postgres text columns.
  if (code === "22021" || code === "22P05") return jsonError(400, "Some text contains characters that are not allowed.");
  return null;
}

/** Wraps a route handler so thrown HttpErrors, validation errors, and database constraint errors become JSON responses. */
export function route<Context>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) return jsonError(error.status, error.message);
      if (error instanceof z.ZodError) return jsonError(400, error.issues[0]?.message && error.issues[0].message !== "Invalid input" ? error.issues[0].message : "Enter valid values for every required field.");
      const databaseResponse = databaseErrorResponse(error);
      if (databaseResponse) return databaseResponse;
      if (isDatabaseUnavailable(error)) {
        console.error("[db] unavailable:", error instanceof Error ? error.message : error);
        return jsonError(503, "The service is temporarily unavailable. Please try again in a moment.");
      }
      console.error(error);
      return jsonError(500, "Something went wrong. Please try again.");
    }
  };
}

/** Returns the signed-in user when they have one of `roles`, otherwise throws 401/403. */
export async function requireUser<R extends Role>(...roles: R[]): Promise<SessionUser & { role: R }> {
  const user = await getSession();
  if (!user) throw new HttpError(401, "Please sign in.");
  if (roles.length && !roles.includes(user.role as R)) throw new HttpError(403, "You do not have access to this page.");
  return user as SessionUser & { role: R };
}

const maxJsonBytes = 1024 * 1024;

/** Reads the body as text, refusing more than `limit` bytes so an oversized request cannot exhaust memory. */
async function readTextWithin(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new HttpError(413, "The request is too large.");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      throw new HttpError(413, "The request is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await readTextWithin(request, maxJsonBytes);
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return schema.parse(body);
}

/** Parses a multipart upload; a malformed body is the client's mistake (400), not a server error. */
export async function readForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "The upload could not be read. Please try again.");
  }
}

export function parseId(value: string | null | undefined) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "A valid record ID is required.");
  return id;
}

export const idSchema = z.coerce.number().int().positive();
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM time.");
