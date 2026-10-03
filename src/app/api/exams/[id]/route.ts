import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

export const DELETE = route(async (_request, { params }: RouteContext<"/api/exams/[id]">) => {
  const user = await requireUser("professor");
  const removed = await db.one<{ filePath: string }>(
    `DELETE FROM exams x USING courses c WHERE x.id = $1 AND c.id = x.course_id AND c.professor_id = $2 RETURNING x.file_path AS "filePath"`,
    [parseId((await params).id), user.id],
  );
  if (!removed) throw new HttpError(404, "Exam not found.");
  await deleteUpload(removed.filePath);
  return NextResponse.json({ ok: true });
});
