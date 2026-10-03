import { db } from "@/lib/db";
import { fileResponse } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";
import { requireCourseAccess } from "@/lib/teaching";

export const runtime = "nodejs";

export const GET = route(async (request, { params }: RouteContext<"/api/materials/[id]/file">) => {
  const user = await requireUser("professor", "student");
  const material = await db.one<{ courseId: number; fileName: string; filePath: string; fileType: string }>(
    `SELECT l.course_id AS "courseId", m.file_name AS "fileName", m.file_path AS "filePath", m.file_type AS "fileType"
       FROM lesson_materials m JOIN course_lessons l ON l.id = m.lesson_id WHERE m.id = $1 AND m.file_path IS NOT NULL`,
    [parseId((await params).id)],
  );
  if (!material) throw new HttpError(404, "Material not found.");
  await requireCourseAccess(material.courseId, user);
  return fileResponse(material.filePath, material.fileName, material.fileType, new URL(request.url).searchParams.get("download") === "1");
});
