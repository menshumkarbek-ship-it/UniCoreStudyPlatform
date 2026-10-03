import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { HttpError, idSchema, parseId, readJson, requireUser, route } from "@/lib/http";
import { notifyUser } from "@/lib/notifications";

export const runtime = "nodejs";

type Context = RouteContext<"/api/exams/[id]/results">;

async function loadOwnExam(examId: number, professorId: number) {
  const exam = await db.one<{ id: number; title: string; groupId: number; points: number; code: string }>(
    `SELECT x.id, x.title, x.group_id AS "groupId", x.points, c.code FROM exams x JOIN courses c ON c.id = x.course_id WHERE x.id = $1 AND c.professor_id = $2`,
    [examId, professorId],
  );
  if (!exam) throw new HttpError(404, "Exam not found.");
  return exam;
}

// Every student in the group, with their result if one has been entered. Students who got a result and later
// moved to another group are still listed.
export const GET = route(async (_request, { params }: Context) => {
  const user = await requireUser("professor");
  const exam = await loadOwnExam(parseId((await params).id), user.id);
  const results = await db.many(
    `WITH roster AS (SELECT student_id FROM enrollments WHERE group_id = $2 UNION SELECT student_id FROM exam_results WHERE exam_id = $1)
     SELECT u.id AS "studentId", u.full_name AS "studentName", u.student_number AS "studentNumber", r.score, r.feedback
       FROM roster JOIN users u ON u.id = roster.student_id
       LEFT JOIN exam_results r ON r.exam_id = $1 AND r.student_id = roster.student_id
      ORDER BY u.full_name`,
    [exam.id, exam.groupId],
  );
  return NextResponse.json({ results, points: exam.points });
});

const resultSchema = z.object({
  studentId: idSchema,
  score: z.coerce.number().int().min(0),
  feedback: z.string().trim().max(2000).optional().transform((value) => value || null),
});

// Enters or changes one student's result; the student is notified each time, as with homework grades.
export const PATCH = route(async (request, { params }: Context) => {
  const user = await requireUser("professor");
  const exam = await loadOwnExam(parseId((await params).id), user.id);
  const { studentId, score, feedback } = await readJson(request, resultSchema);
  if (score > exam.points) throw new HttpError(400, `The score cannot be more than ${exam.points} points.`);
  await transaction(async (tx) => {
    const inGroup = await tx.one("SELECT 1 FROM enrollments WHERE student_id = $1 AND group_id = $2 UNION SELECT 1 FROM exam_results WHERE student_id = $1 AND exam_id = $3", [studentId, exam.groupId, exam.id]);
    if (!inGroup) throw new HttpError(404, "This student does not take this exam.");
    await tx.run(
      `INSERT INTO exam_results (exam_id, student_id, score, feedback, graded_by) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id, student_id) DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, graded_at = now(), graded_by = EXCLUDED.graded_by`,
      [exam.id, studentId, score, feedback, user.id],
    );
    await notifyUser(tx, studentId, `Exam result: ${exam.title}`, `${exam.code} · ${score}/${exam.points}${feedback ? ` · ${feedback}` : ""}`, "/grades");
  });
  return NextResponse.json({ ok: true });
});
