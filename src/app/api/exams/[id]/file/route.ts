import { db } from "@/lib/db";
import { fileResponse } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";
import { studentGroupId } from "@/lib/teaching";

export const runtime = "nodejs";

export const GET = route(async (request, { params }: RouteContext<"/api/exams/[id]/file">) => {
  const user = await requireUser("professor", "student");
  const exam = await db.one<{ groupId: number; professorId: number; fileName: string; filePath: string; fileType: string }>(
    `SELECT x.group_id AS "groupId", c.professor_id AS "professorId", x.file_name AS "fileName", x.file_path AS "filePath", x.file_type AS "fileType"
       FROM exams x JOIN courses c ON c.id = x.course_id WHERE x.id = $1`,
    [parseId((await params).id)],
  );
  const allowed = exam && (user.role === "professor" ? exam.professorId === user.id : await studentGroupId(user.id) === exam.groupId);
  if (!allowed) throw new HttpError(404, "Exam not found.");
  return fileResponse(exam.filePath, exam.fileName, exam.fileType, new URL(request.url).searchParams.get("download") === "1");
});
