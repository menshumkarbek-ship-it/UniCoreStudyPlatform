import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const database = getDatabase();
  const user = database.prepare("SELECT email, full_name AS fullName, role, student_id AS studentId, profile_photo AS profilePhoto FROM users WHERE id = ?").get(session.userId) as { email: string; fullName: string; role: Session["role"]; studentId: string | null; profilePhoto: string | null } | undefined;
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const university = database.prepare("SELECT id, name, city FROM universities WHERE id = ?").get(session.universityId);
  return NextResponse.json({ user: { ...session, email: user.email, fullName: user.fullName, role: user.role, profilePhoto: user.profilePhoto, studentId: user.studentId }, university });
}
