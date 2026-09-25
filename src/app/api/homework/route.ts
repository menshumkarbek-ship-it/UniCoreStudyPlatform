import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { notifyGroup } from "@/lib/notifications";

export const runtime = "nodejs";

const homeworkSchema = z.object({ courseId: z.coerce.number().int().positive(), groupId: z.coerce.number().int().positive(), title: z.string().trim().min(2).max(160), instructions: z.string().trim().min(2).max(5000), dueAt: z.string().datetime(), points: z.coerce.number().int().positive().max(1000) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const homework = session.role === "professor"
    ? database.prepare("SELECT h.id, h.title, h.instructions, h.due_at, h.points, c.code AS course_code, c.title AS course_title, g.name AS group_name, COUNT(s.id) AS submitted_count FROM homework h JOIN courses c ON c.id = h.course_id JOIN groups g ON g.id = h.group_id LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.status IN ('submitted', 'graded') WHERE h.created_by = ? GROUP BY h.id ORDER BY h.due_at").all(session.userId)
    : database.prepare("SELECT h.id, h.title, h.instructions, h.due_at, h.points, c.code AS course_code, c.title AS course_title, g.name AS group_name, COALESCE(s.status, 'open') AS status, s.file_name, s.file_type, s.file_size, s.submitted_at, s.grade FROM homework h JOIN courses c ON c.id = h.course_id JOIN groups g ON g.id = h.group_id JOIN enrollments e ON e.group_id = h.group_id LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = ? WHERE e.user_id = ? ORDER BY h.due_at").all(session.userId, session.userId);
  const groups = session.role === "professor"
    ? database.prepare("SELECT g.id, g.name, c.id AS course_id, c.code AS course_code, c.title AS course_title, COUNT(DISTINCT e.user_id) AS student_count FROM course_professors cp JOIN courses c ON c.id = cp.course_id JOIN groups g ON g.university_id = c.university_id AND (c.faculty_id IS NULL OR g.faculty_id = c.faculty_id) JOIN enrollments e ON e.group_id = g.id JOIN users student ON student.id = e.user_id AND student.role = 'student' WHERE cp.professor_id = ? GROUP BY g.id, g.name, c.id, c.code, c.title ORDER BY c.code, g.name").all(session.userId)
    : [];
  return NextResponse.json({ homework, groups });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Professor access required." }, { status: 403 });
  const parsed = homeworkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid homework details." }, { status: 400 });
  const { courseId, groupId, title, instructions, dueAt, points } = parsed.data;
  const database = getDatabase();
  const assignment = database.prepare("SELECT 1 FROM course_professors cp JOIN courses c ON c.id = cp.course_id JOIN groups g ON g.id = ? WHERE cp.professor_id = ? AND cp.course_id = ? AND g.university_id = c.university_id AND (c.faculty_id IS NULL OR g.faculty_id = c.faculty_id)").get(groupId, session.userId, courseId);
  if (!assignment) return NextResponse.json({ error: "You do not teach this course group." }, { status: 403 });
  const result = database.prepare("INSERT INTO homework (course_id, group_id, created_by, title, instructions, due_at, points) VALUES (?, ?, ?, ?, ?, ?, ?)").run(courseId, groupId, session.userId, title, instructions, dueAt, points);
  const course = database.prepare("SELECT c.code, g.name AS groupName FROM courses c JOIN groups g ON g.id = ? WHERE c.id = ?").get(courseId, groupId) as { code: string; groupName: string };
  try {
    notifyGroup(database, groupId, `New homework: ${title}`, `${course.code} · ${course.groupName} · Due ${new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, "/homework");
  } catch {}
  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}
