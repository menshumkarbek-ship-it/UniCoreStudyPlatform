import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const examId = Number((await params).id);
  const database = getDatabase();
  const exam = database.prepare("SELECT id, group_id AS groupId, created_by AS createdBy, file_name AS fileName, file_path AS filePath, file_type AS fileType FROM exams WHERE id = ?").get(examId) as { id: number; groupId: number; createdBy: number; fileName: string; filePath: string; fileType: string } | undefined;
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  const allowed = session.role === "professor" ? exam.createdBy === session.userId : Boolean(database.prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND group_id = ?").get(session.userId, exam.groupId));
  if (!allowed) return NextResponse.json({ error: "You cannot access this exam file." }, { status: 403 });
  try {
    const content = await readFile(path.join(process.cwd(), "data", "uploads", exam.filePath));
    return new NextResponse(content, { headers: { "Content-Type": exam.fileType, "Content-Disposition": `inline; filename="${encodeURIComponent(exam.fileName)}"`, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "Exam file is unavailable." }, { status: 404 });
  }
}
