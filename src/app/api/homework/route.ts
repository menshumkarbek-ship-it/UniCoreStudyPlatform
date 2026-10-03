import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { HttpError, idSchema, readJson, requireUser, route } from "@/lib/http";
import { gradingScheme, resolveComponent } from "@/lib/grading";
import { notifyGroup } from "@/lib/notifications";
import { professorOfferings, requireOwnedOffering } from "@/lib/teaching";

export const runtime = "nodejs";

const homeworkSchema = z.object({
  courseId: idSchema,
  groupId: idSchema,
  title: z.string().trim().min(2).max(160),
  instructions: z.string().trim().min(2).max(5000),
  dueAt: z.string().datetime({ offset: true }),
  points: z.coerce.number().int().positive().max(1000),
  componentId: idSchema.optional(),
});

export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  if (user.role === "professor") {
    const [homework, offerings] = await Promise.all([
      db.many(
        `SELECT h.id, h.title, h.instructions, h.due_at AS "dueAt", h.points, h.created_at AS "createdAt",
                c.id AS "courseId", c.code AS "courseCode", c.title AS "courseTitle", g.id AS "groupId", g.name AS "groupName",
                h.component_id AS "componentId", gc.name AS "componentName",
                (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = h.group_id) AS "studentCount",
                (SELECT COUNT(*) FROM homework_submissions s WHERE s.homework_id = h.id) AS "submittedCount",
                (SELECT COUNT(*) FROM homework_submissions s WHERE s.homework_id = h.id AND s.status = 'graded') AS "gradedCount"
           FROM homework h JOIN courses c ON c.id = h.course_id JOIN groups g ON g.id = h.group_id JOIN grading_components gc ON gc.id = h.component_id
          WHERE c.professor_id = $1
          ORDER BY h.due_at DESC`,
        [user.id],
      ),
      professorOfferings(user.id),
    ]);
    return NextResponse.json({ homework, offerings, components: await gradingScheme(user.universityId!) });
  }
  const homework = await db.many(
    `SELECT h.id, h.title, h.instructions, h.due_at AS "dueAt", h.points,
            c.code AS "courseCode", c.title AS "courseTitle", g.name AS "groupName", p.full_name AS "professorName", gc.name AS "componentName",
            s.status, s.file_name AS "fileName", s.submitted_at AS "submittedAt", s.grade, s.feedback
       FROM enrollments e
       JOIN homework h ON h.group_id = e.group_id
       JOIN courses c ON c.id = h.course_id
       JOIN groups g ON g.id = h.group_id
       JOIN users p ON p.id = c.professor_id
       JOIN grading_components gc ON gc.id = h.component_id
       LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = e.student_id
      WHERE e.student_id = $1
      ORDER BY h.due_at`,
    [user.id],
  );
  return NextResponse.json({ homework });
});

export const POST = route(async (request) => {
  const user = await requireUser("professor");
  const data = await readJson(request, homeworkSchema);
  if (new Date(data.dueAt).getTime() <= Date.now()) throw new HttpError(400, "The deadline must be in the future.");
  const id = await transaction(async (tx) => {
    const offering = await requireOwnedOffering(user.id, data.courseId, data.groupId, tx);
    const componentId = await resolveComponent(tx, user.universityId!, data.componentId, "homework");
    const created = await tx.one<{ id: number }>(
      "INSERT INTO homework (course_id, group_id, created_by, title, instructions, due_at, points, component_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [data.courseId, data.groupId, user.id, data.title, data.instructions, data.dueAt, data.points, componentId],
    );
    await notifyGroup(tx, data.groupId, `New homework: ${data.title}`, `${offering.courseCode} · due ${new Date(data.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: user.timezone })}`, "/homework", user.id);
    return created!.id;
  });
  return NextResponse.json({ id }, { status: 201 });
});
