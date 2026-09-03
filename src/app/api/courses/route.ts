import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const courses = session.role === "professor"
    ? database.prepare("SELECT c.id, c.code, c.title, COUNT(DISTINCT ta.group_id) AS group_count FROM courses c JOIN teaching_assignments ta ON ta.course_id = c.id WHERE ta.professor_id = ? GROUP BY c.id ORDER BY c.code").all(session.userId)
    : database.prepare("SELECT DISTINCT c.id, c.code, c.title FROM courses c JOIN teaching_assignments ta ON ta.course_id = c.id JOIN enrollments e ON e.group_id = ta.group_id WHERE e.user_id = ? ORDER BY c.code").all(session.userId);
  return NextResponse.json({ courses });
}
