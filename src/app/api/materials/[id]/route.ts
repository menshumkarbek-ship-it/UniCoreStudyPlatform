import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

export const DELETE = route(async (_request, { params }: RouteContext<"/api/materials/[id]">) => {
  const user = await requireUser("professor");
  const removed = await db.one<{ filePath: string | null }>(
    `DELETE FROM lesson_materials m USING course_lessons l, courses c
      WHERE m.id = $1 AND l.id = m.lesson_id AND c.id = l.course_id AND c.professor_id = $2 RETURNING m.file_path AS "filePath"`,
    [parseId((await params).id), user.id],
  );
  if (!removed) throw new HttpError(404, "Material not found.");
  await deleteUpload(removed.filePath);
  return NextResponse.json({ ok: true });
});
