import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const courses = session.role === "professor"
    ? database.prepare("SELECT c.id, c.code, c.title, f.name AS facultyName, COUNT(DISTINCT ta.group_id) AS group_count, COALESCE(GROUP_CONCAT(DISTINCT g.name), '') AS group_names, COUNT(DISTINCT e.user_id) AS student_count FROM courses c LEFT JOIN faculties f ON f.id = c.faculty_id LEFT JOIN teaching_assignments ta ON ta.course_id = c.id AND ta.professor_id = ? LEFT JOIN groups g ON g.id = ta.group_id LEFT JOIN enrollments e ON e.group_id = g.id WHERE (ta.professor_id IS NOT NULL OR (NOT EXISTS (SELECT 1 FROM teaching_assignments WHERE professor_id = ?) AND c.university_id = (SELECT university_id FROM users WHERE id = ?))) GROUP BY c.id ORDER BY c.code").all(session.userId, session.userId, session.userId)
    : database.prepare("SELECT c.id, c.code, c.title, f.name AS facultyName, COALESCE(GROUP_CONCAT(DISTINCT u.full_name), '') AS professorName FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN courses c ON c.university_id = g.university_id AND (c.faculty_id IS NULL OR c.faculty_id = g.faculty_id) LEFT JOIN faculties f ON f.id = c.faculty_id LEFT JOIN course_professors cp ON cp.course_id = c.id LEFT JOIN users u ON u.id = cp.professor_id WHERE e.user_id = ? GROUP BY c.id, c.code, c.title, f.name ORDER BY c.code").all(session.userId);
  return NextResponse.json({ courses });
}
