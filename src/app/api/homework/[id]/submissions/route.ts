import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "application/pdf"]);
const maxFileSize = 10 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

async function getHomework(id: number) {
  const database = getDatabase();
  return database.prepare("SELECT id, group_id, created_by, due_at FROM homework WHERE id = ?").get(id) as { id: number; group_id: number; created_by: number; due_at: string } | undefined;
}

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Professor access required." }, { status: 403 });
  const homeworkId = Number((await params).id);
  const homework = await getHomework(homeworkId);
  if (!homework || homework.created_by !== session.userId) return NextResponse.json({ error: "Homework not found." }, { status: 404 });
  const database = getDatabase();
  const submissions = database.prepare("SELECT s.id, s.student_id AS studentId, u.full_name AS studentName, u.email, s.status, s.file_name AS fileName, s.file_type AS fileType, s.file_size AS fileSize, s.submitted_at AS submittedAt FROM homework_submissions s JOIN users u ON u.id = s.student_id JOIN enrollments e ON e.user_id = s.student_id AND e.group_id = ? WHERE s.homework_id = ? ORDER BY u.full_name").all(homework.group_id, homeworkId);
  return NextResponse.json({ submissions });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
  const homeworkId = Number((await params).id);
  const homework = await getHomework(homeworkId);
  if (!homework) return NextResponse.json({ error: "Homework not found." }, { status: 404 });
  if (new Date(homework.due_at).getTime() <= Date.now()) return NextResponse.json({ error: "This homework is closed." }, { status: 409 });
  const database = getDatabase();
  const enrollment = database.prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND group_id = ?").get(session.userId, homework.group_id);
  if (!enrollment) return NextResponse.json({ error: "You are not enrolled in this homework group." }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a JPG or PDF file." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Only JPG and PDF files are accepted." }, { status: 415 });
  if (file.size > maxFileSize) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  const extension = file.type === "application/pdf" ? ".pdf" : ".jpg";
  const relativePath = path.join("homework", `${homeworkId}-${session.userId}-${Date.now()}${extension}`);
  const absolutePath = path.join(process.cwd(), "data", "uploads", relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const existing = database.prepare("SELECT file_path FROM homework_submissions WHERE homework_id = ? AND student_id = ?").get(homeworkId, session.userId) as { file_path: string | null } | undefined;
  if (existing?.file_path) await unlink(path.join(process.cwd(), "data", "uploads", existing.file_path)).catch(() => undefined);
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  database.prepare("INSERT INTO homework_submissions (homework_id, student_id, status, submitted_at, file_name, file_path, file_type, file_size) VALUES (?, ?, 'submitted', CURRENT_TIMESTAMP, ?, ?, ?, ?) ON CONFLICT(homework_id, student_id) DO UPDATE SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, file_name = excluded.file_name, file_path = excluded.file_path, file_type = excluded.file_type, file_size = excluded.file_size").run(homeworkId, session.userId, file.name, relativePath, file.type, file.size);
  return NextResponse.json({ ok: true, fileName: file.name });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });
  const homeworkId = Number((await params).id);
  const homework = await getHomework(homeworkId);
  if (!homework) return NextResponse.json({ error: "Homework not found." }, { status: 404 });
  if (new Date(homework.due_at).getTime() <= Date.now()) return NextResponse.json({ error: "This homework is closed." }, { status: 409 });
  const database = getDatabase();
  const existing = database.prepare("SELECT file_path FROM homework_submissions WHERE homework_id = ? AND student_id = ?").get(homeworkId, session.userId) as { file_path: string | null } | undefined;
  if (existing?.file_path) await unlink(path.join(process.cwd(), "data", "uploads", existing.file_path)).catch(() => undefined);
  database.prepare("DELETE FROM homework_submissions WHERE homework_id = ? AND student_id = ?").run(homeworkId, session.userId);
  return NextResponse.json({ ok: true });
}
