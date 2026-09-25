import { NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(200),
  universityName: z.string().trim().min(1).max(200).optional(),
  role: z.enum(["student", "professor", "admin"]),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid university, ID, and password." }, { status: 400 });
  const { identifier, password, universityName, role } = parsed.data;
  const database = getDatabase();
  const userSelect = "SELECT id, university_id, email, full_name, password_hash, role FROM users";
  const user = role === "admin"
    ? database.prepare(`${userSelect} WHERE email = ? AND role = 'admin'`).get(identifier.toLowerCase())
    : database.prepare(`${userSelect} WHERE university_id = (SELECT id FROM universities WHERE name = ? COLLATE NOCASE) AND (email = ? OR (role = 'student' AND student_id = ?)) AND role = ?`).get(universityName, identifier.toLowerCase(), identifier, role);
  const authenticatedUser = user;
  if (!authenticatedUser && role !== "admin" && !universityName) return NextResponse.json({ error: "Choose your university." }, { status: 400 });
  if (!authenticatedUser || authenticatedUser.role !== role || !compareSync(password, authenticatedUser.password_hash)) {
    return NextResponse.json({ error: role === "admin" ? "Those administrator credentials are incorrect." : "Those credentials do not match this university and role." }, { status: 401 });
  }
  await createSession({ userId: authenticatedUser.id, universityId: authenticatedUser.university_id, role: authenticatedUser.role, email: authenticatedUser.email, fullName: authenticatedUser.full_name });
  const university = database.prepare("SELECT id, name, city FROM universities WHERE id = ?").get(authenticatedUser.university_id);
  return NextResponse.json({ user: { email: authenticatedUser.email, fullName: authenticatedUser.full_name, role: authenticatedUser.role }, university });
}
