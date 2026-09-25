import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get("studentId"));
  const homeworkId = Number((await params).id);
  const database = getDatabase();
  const homework = database.prepare("SELECT id, group_id, created_by FROM homework WHERE id = ?").get(homeworkId) as { id: number; group_id: number; created_by: number } | undefined;
  if (!homework) return NextResponse.json({ error: "Homework not found." }, { status: 404 });
  const targetStudentId = session.role === "professor" ? studentId : session.userId;
  if (!targetStudentId) return NextResponse.json({ error: "Student submission is required." }, { status: 400 });
  if (session.role === "professor") {
    if (homework.created_by !== session.userId) return NextResponse.json({ error: "Homework not found." }, { status: 404 });
  } else {
    const enrollment = database.prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND group_id = ?").get(session.userId, homework.group_id);
    if (!enrollment || targetStudentId !== session.userId) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }
  const submission = database.prepare("SELECT file_path, file_name, file_type FROM homework_submissions WHERE homework_id = ? AND student_id = ?").get(homeworkId, targetStudentId) as { file_path: string; file_name: string; file_type: string } | undefined;
  if (!submission?.file_path) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const content = await readFile(path.join(process.cwd(), "data", "uploads", submission.file_path));
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(content, { headers: { "Content-Type": submission.file_type, "Content-Disposition": `${disposition}; filename="${submission.file_name.replaceAll('"', "")}"` } });
}
