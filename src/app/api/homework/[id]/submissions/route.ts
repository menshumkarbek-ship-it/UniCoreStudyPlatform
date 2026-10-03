import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { assertBodyWithin, deleteUpload, documentKinds, saveUpload, validateUpload } from "@/lib/files";
import { HttpError, idSchema, parseId, readForm, readJson, requireUser, route } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";
import { loadHomework } from "@/lib/teaching";

export const runtime = "nodejs";

type Context = RouteContext<"/api/homework/[id]/submissions">;
const maxFileSize = 10 * 1024 * 1024;

// Professor view: every student in the group, with their submission if they made one.
// Students who submitted and later moved to another group are still listed.
export const GET = route(async (_request, { params }: Context) => {
  const user = await requireUser("professor");
  const homework = await loadHomework(parseId((await params).id), user);
  const submissions = await db.many(
    `WITH roster AS (
       SELECT student_id FROM enrollments WHERE group_id = $2
       UNION SELECT student_id FROM homework_submissions WHERE homework_id = $1
     )
     SELECT u.id AS "studentId", u.full_name AS "studentName", u.student_number AS "studentNumber",
            s.status, s.file_name AS "fileName", s.file_size AS "fileSize", s.submitted_at AS "submittedAt", s.grade, s.feedback
       FROM roster r JOIN users u ON u.id = r.student_id
       LEFT JOIN homework_submissions s ON s.homework_id = $1 AND s.student_id = r.student_id
      ORDER BY u.full_name`,
    [homework.id, homework.groupId],
  );
  return NextResponse.json({ submissions, points: homework.points });
});

// Student upload. The new file is written first and the old one removed only after the database
// points at the new file, so a failed upload never loses the previous submission.
export const POST = route(async (request, { params }: Context) => {
  const user = await requireUser("student");
  assertBodyWithin(request, maxFileSize);
  const homework = await loadHomework(parseId((await params).id), user);
  if (new Date(homework.dueAt).getTime() <= Date.now()) throw new HttpError(409, "The deadline has passed. Submissions are closed.");
  const upload = await validateUpload((await readForm(request)).get("file"), documentKinds, maxFileSize, "PDF, JPG, or PNG");
  const filePath = await saveUpload(`homework/${homework.id}`, upload);
  try {
    const previousPath = await transaction(async (tx) => {
      const existing = await tx.one<{ filePath: string; status: string }>(`SELECT file_path AS "filePath", status FROM homework_submissions WHERE homework_id = $1 AND student_id = $2 FOR UPDATE`, [homework.id, user.id]);
      if (existing?.status === "graded") throw new HttpError(409, "This homework has already been graded and can no longer be changed.");
      await tx.run(
        `INSERT INTO homework_submissions (homework_id, student_id, status, file_name, file_path, file_type, file_size)
         VALUES ($1, $2, 'submitted', $3, $4, $5, $6)
         ON CONFLICT (homework_id, student_id) DO UPDATE
           SET submitted_at = now(), file_name = EXCLUDED.file_name, file_path = EXCLUDED.file_path, file_type = EXCLUDED.file_type, file_size = EXCLUDED.file_size`,
        [homework.id, user.id, upload.name, filePath, upload.contentType, upload.size],
      );
      await notifyUser(tx, homework.professorId, `${existing ? "Resubmitted" : "Submitted"}: ${homework.title}`, `${user.fullName} · ${homework.courseCode}`, `/homework?open=${homework.id}`);
      return existing?.filePath;
    });
    await deleteUpload(previousPath);
  } catch (error) {
    await deleteUpload(filePath);
    throw error;
  }
  return NextResponse.json({ fileName: upload.name });
});

export const DELETE = route(async (_request, { params }: Context) => {
  const user = await requireUser("student");
  const homework = await loadHomework(parseId((await params).id), user);
  if (new Date(homework.dueAt).getTime() <= Date.now()) throw new HttpError(409, "The deadline has passed. Submissions are closed.");
  const removed = await db.one<{ filePath: string }>(`DELETE FROM homework_submissions WHERE homework_id = $1 AND student_id = $2 AND status = 'submitted' RETURNING file_path AS "filePath"`, [homework.id, user.id]);
  if (!removed) throw new HttpError(409, "There is no ungraded submission to remove.");
  await deleteUpload(removed.filePath);
  return NextResponse.json({ ok: true });
});

const gradeSchema = z.object({
  studentId: idSchema,
  grade: z.coerce.number().int().min(0),
  feedback: z.string().trim().max(2000).optional().transform((value) => value || null),
});

// Professor grading. Re-grading is allowed; the student is notified each time.
export const PATCH = route(async (request, { params }: Context) => {
  const user = await requireUser("professor");
  const homework = await loadHomework(parseId((await params).id), user);
  const { studentId, grade, feedback } = await readJson(request, gradeSchema);
  if (grade > homework.points) throw new HttpError(400, `The grade cannot be more than ${homework.points} points.`);
  await transaction(async (tx) => {
    const updated = await tx.run(
      "UPDATE homework_submissions SET status = 'graded', grade = $3, feedback = $4, graded_at = now(), graded_by = $5 WHERE homework_id = $1 AND student_id = $2",
      [homework.id, studentId, grade, feedback, user.id],
    );
    if (!updated) throw new HttpError(404, "This student has not submitted anything to grade.");
    await notifyUser(tx, studentId, `Graded: ${homework.title}`, `${homework.courseCode} · ${grade}/${homework.points}${feedback ? ` · ${feedback}` : ""}`, "/grades");
  });
  return NextResponse.json({ ok: true });
});
