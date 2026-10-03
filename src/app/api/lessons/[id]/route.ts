import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { deleteUpload } from "@/lib/files";
import { HttpError, parseId, readJson, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

type Context = RouteContext<"/api/lessons/[id]">;

async function requireOwnedLesson(id: number, professorId: number) {
  const lesson = await db.one(`SELECT 1 FROM course_lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1 AND c.professor_id = $2`, [id, professorId]);
  if (!lesson) throw new HttpError(404, "Lesson not found.");
}

const patchSchema = z.object({ topic: z.string().trim().min(1).max(300) });

export const PATCH = route(async (request, { params }: Context) => {
  const user = await requireUser("professor");
  const id = parseId((await params).id);
  await requireOwnedLesson(id, user.id);
  const { topic } = await readJson(request, patchSchema);
  await db.run("UPDATE course_lessons SET topic = $2 WHERE id = $1", [id, topic]);
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (_request, { params }: Context) => {
  const user = await requireUser("professor");
  const id = parseId((await params).id);
  await requireOwnedLesson(id, user.id);
  const files = await transaction(async (tx) => {
    const rows = await tx.many<{ filePath: string }>(`SELECT file_path AS "filePath" FROM lesson_materials WHERE lesson_id = $1 AND file_path IS NOT NULL`, [id]);
    await tx.run("DELETE FROM course_lessons WHERE id = $1", [id]);
    return rows;
  });
  await Promise.all(files.map((file) => deleteUpload(file.filePath)));
  return NextResponse.json({ ok: true });
});
