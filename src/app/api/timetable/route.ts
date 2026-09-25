import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const entries = session.role === "professor"
    ? database.prepare("SELECT te.id, te.weekday, te.starts_at AS startsAt, te.ends_at AS endsAt, te.room, c.code, c.title, g.name AS groupName, u.full_name AS professorName FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id JOIN users u ON u.id = te.professor_id WHERE te.professor_id = ? ORDER BY te.weekday, te.starts_at").all(session.userId)
    : database.prepare("SELECT DISTINCT te.id, te.weekday, te.starts_at AS startsAt, te.ends_at AS endsAt, te.room, c.code, c.title, g.name AS groupName, u.full_name AS professorName FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id JOIN users u ON u.id = te.professor_id JOIN enrollments e ON e.group_id = te.group_id WHERE e.user_id = ? ORDER BY te.weekday, te.starts_at").all(session.userId);
  return NextResponse.json({ entries });
}
