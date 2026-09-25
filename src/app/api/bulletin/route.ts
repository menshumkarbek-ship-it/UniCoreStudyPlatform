import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { notifyGroup } from "@/lib/notifications";

export const runtime = "nodejs";

const announcementSchema = z.object({ groupId: z.coerce.number().int().positive(), title: z.string().trim().min(2).max(160), detail: z.string().trim().min(2).max(5000) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const announcements = session.role === "professor"
    ? database.prepare("SELECT a.id, a.title, a.detail, a.created_at AS createdAt, g.name AS groupName FROM announcements a JOIN groups g ON g.id = a.group_id WHERE a.created_by = ? ORDER BY a.created_at DESC").all(session.userId)
    : database.prepare("SELECT a.id, a.title, a.detail, a.created_at AS createdAt, g.name AS groupName, u.full_name AS professorName FROM announcements a JOIN groups g ON g.id = a.group_id JOIN users u ON u.id = a.created_by JOIN enrollments e ON e.group_id = a.group_id WHERE e.user_id = ? ORDER BY a.created_at DESC").all(session.userId);
  const groups = session.role === "professor"
    ? database.prepare("SELECT DISTINCT g.id, g.name, c.code, c.title AS courseTitle FROM course_professors cp JOIN courses c ON c.id = cp.course_id JOIN groups g ON g.university_id = c.university_id AND (c.faculty_id IS NULL OR g.faculty_id = c.faculty_id) WHERE cp.professor_id = ? ORDER BY c.code, g.name").all(session.userId)
    : [];
  return NextResponse.json({ announcements, groups });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Professor access required." }, { status: 403 });
  const parsed = announcementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a title, message, and group." }, { status: 400 });
  const { groupId, title, detail } = parsed.data;
  const database = getDatabase();
  const teaching = database.prepare("SELECT 1 FROM course_professors cp JOIN courses c ON c.id = cp.course_id JOIN groups g ON g.id = ? WHERE cp.professor_id = ? AND g.university_id = c.university_id AND (c.faculty_id IS NULL OR g.faculty_id = c.faculty_id)").get(groupId, session.userId);
  if (!teaching) return NextResponse.json({ error: "You do not teach this group." }, { status: 403 });
  const result = database.prepare("INSERT INTO announcements (group_id, created_by, title, detail) VALUES (?, ?, ?, ?)").run(groupId, session.userId, title, detail);
  notifyGroup(database, groupId, `Bulletin: ${title}`, detail, "/bulletin");
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
