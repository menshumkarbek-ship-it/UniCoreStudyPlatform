import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertBodyWithin, deleteUpload, saveUpload, validateMaterial } from "@/lib/files";
import { HttpError, parseId, readForm, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

const maxFileSize = 50 * 1024 * 1024;
const linkSchema = z.string().trim().url().max(2000).refine((value) => /^https?:\/\//i.test(value));

// Adds a material to a lesson: an uploaded file, or a link (a recorded lecture, an article).
export const POST = route(async (request, { params }: RouteContext<"/api/lessons/[id]/materials">) => {
  const user = await requireUser("professor");
  assertBodyWithin(request, maxFileSize);
  const lessonId = parseId((await params).id);
  const lesson = await db.one<{ courseId: number }>(`SELECT l.course_id AS "courseId" FROM course_lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1 AND c.professor_id = $2`, [lessonId, user.id]);
  if (!lesson) throw new HttpError(404, "Lesson not found.");
  const form = await readForm(request);
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const upload = await validateMaterial(file, maxFileSize);
    const filePath = await saveUpload(`materials/${lesson.courseId}`, upload);
    try {
      const created = await db.one<{ id: number }>(
        "INSERT INTO lesson_materials (lesson_id, title, file_name, file_path, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [lessonId, title || upload.name, upload.name, filePath, upload.contentType, upload.size],
      );
      return NextResponse.json({ id: created!.id }, { status: 201 });
    } catch (error) {
      await deleteUpload(filePath);
      throw error;
    }
  }
  const url = linkSchema.safeParse(String(form.get("url") ?? ""));
  if (!url.success) throw new HttpError(400, "Choose a file, or paste a link starting with http:// or https://.");
  const created = await db.one<{ id: number }>("INSERT INTO lesson_materials (lesson_id, title, url) VALUES ($1, $2, $3) RETURNING id", [lessonId, title || new URL(url.data).hostname, url.data]);
  return NextResponse.json({ id: created!.id }, { status: 201 });
});
