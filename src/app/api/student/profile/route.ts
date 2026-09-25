import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
  const database = getDatabase();
  const user = database.prepare("SELECT u.email, u.full_name AS fullName, u.student_id AS studentId, u.profile_photo AS profilePhoto, un.id AS universityId, un.name AS universityName, un.city AS universityCity FROM users u JOIN universities un ON un.id = u.university_id WHERE u.id = ? AND u.role = 'student'").get(session.userId);
  if (!user) return NextResponse.json({ error: "Student account not found." }, { status: 404 });
  const groups = database.prepare("SELECT DISTINCT g.id, g.name, f.id AS facultyId, f.name AS facultyName FROM enrollments e JOIN groups g ON g.id = e.group_id LEFT JOIN faculties f ON f.id = g.faculty_id WHERE e.user_id = ? ORDER BY g.name").all(session.userId);
  return NextResponse.json({ user, groups });
}
