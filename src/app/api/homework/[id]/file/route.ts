import { db } from "@/lib/db";
import { fileResponse } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";
import { loadHomework } from "@/lib/teaching";

export const runtime = "nodejs";

// Students can open their own submission; the course's professor can open anyone's (?studentId=).
export const GET = route(async (request, { params }: RouteContext<"/api/homework/[id]/file">) => {
  const user = await requireUser("professor", "student");
  const homework = await loadHomework(parseId((await params).id), user);
  const url = new URL(request.url);
  const studentId = user.role === "professor" ? parseId(url.searchParams.get("studentId")) : user.id;
  const submission = await db.one<{ filePath: string; fileName: string; fileType: string }>(
    `SELECT file_path AS "filePath", file_name AS "fileName", file_type AS "fileType" FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
    [homework.id, studentId],
  );
  if (!submission) throw new HttpError(404, "No file has been submitted.");
  return fileResponse(submission.filePath, submission.fileName, submission.fileType, url.searchParams.get("download") === "1");
});
