import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { assertBodyWithin, deleteUpload, documentKinds, saveUpload, validateUpload } from "@/lib/files";
import { HttpError, idSchema, readForm, requireUser, route, timeSchema } from "@/lib/http";
import { gradingScheme, resolveComponent } from "@/lib/grading";
import { notifyGroup } from "@/lib/notifications";
import { timetableColumns, timetableJoins } from "@/lib/teaching";
import { clockIn, weekdayOfDate } from "@/lib/time";

export const runtime = "nodejs";

const examColumns = `x.id, x.title, x.exam_date AS "examDate", x.starts_at AS "startsAt", x.ends_at AS "endsAt", x.file_name AS "fileName",
  x.points, x.component_id AS "componentId", gc.name AS "componentName", c.code, c.title AS "courseTitle", g.name AS "groupName"`;
const examJoins = "FROM exams x JOIN courses c ON c.id = x.course_id JOIN groups g ON g.id = x.group_id JOIN grading_components gc ON gc.id = x.component_id";

export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  const today = clockIn(user.timezone).date;
  if (user.role === "professor") {
    const [entries, exams] = await Promise.all([
      db.many(`SELECT ${timetableColumns} ${timetableJoins} WHERE c.professor_id = $1 ORDER BY te.weekday, te.starts_at`, [user.id]),
      db.many(
        `SELECT ${examColumns}, (SELECT COUNT(*) FROM exam_results r WHERE r.exam_id = x.id) AS "resultCount",
                (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = x.group_id) AS "studentCount"
           ${examJoins} WHERE c.professor_id = $1 ORDER BY x.exam_date DESC, x.starts_at`,
        [user.id],
      ),
    ]);
    return NextResponse.json({ entries, exams, today, components: await gradingScheme(user.universityId!) });
  }
  const exams = await db.many(
    `SELECT ${examColumns}, r.score, r.feedback ${examJoins}
       LEFT JOIN exam_results r ON r.exam_id = x.id AND r.student_id = $1
      WHERE x.group_id = (SELECT group_id FROM enrollments WHERE student_id = $1)
      ORDER BY x.exam_date, x.starts_at`,
    [user.id],
  );
  return NextResponse.json({ exams, today });
});

const examSchema = z.object({
  timetableEntryId: idSchema,
  title: z.string().trim().min(2).max(200),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an exam date."),
  startsAt: timeSchema,
  endsAt: timeSchema,
  points: z.coerce.number().int().positive("The maximum score must be at least 1.").max(1000).default(100),
  componentId: idSchema.optional(),
});

export const POST = route(async (request) => {
  const user = await requireUser("professor");
  assertBodyWithin(request, 10 * 1024 * 1024);
  const formData = await readForm(request);
  const data = examSchema.parse(Object.fromEntries(["timetableEntryId", "title", "examDate", "startsAt", "endsAt", "points", "componentId"].map((key) => [key, formData.get(key) || undefined])));
  const entry = await db.one<{ id: number; courseId: number; groupId: number; code: string; weekday: number; startsAt: string; endsAt: string }>(
    `SELECT te.id, te.course_id AS "courseId", te.group_id AS "groupId", c.code, te.weekday, te.starts_at AS "startsAt", te.ends_at AS "endsAt"
       FROM timetable_entries te JOIN courses c ON c.id = te.course_id WHERE te.id = $1 AND c.professor_id = $2`,
    [data.timetableEntryId, user.id],
  );
  if (!entry) throw new HttpError(404, "Choose one of your scheduled classes.");
  if (data.examDate < clockIn(user.timezone).date) throw new HttpError(409, "The exam date cannot be in the past.");
  if (weekdayOfDate(data.examDate) !== entry.weekday) throw new HttpError(409, "The exam date must fall on the day this class meets.");
  if (data.startsAt < entry.startsAt || data.endsAt > entry.endsAt || data.endsAt <= data.startsAt) throw new HttpError(409, `The exam must fit inside the class time (${entry.startsAt}–${entry.endsAt}).`);
  const overlapping = await db.one("SELECT 1 FROM exams WHERE group_id = $1 AND exam_date = $2 AND starts_at < $4 AND ends_at > $3", [entry.groupId, data.examDate, data.startsAt, data.endsAt]);
  if (overlapping) throw new HttpError(409, "This group already has an exam at that time.");
  const upload = await validateUpload(formData.get("file"), documentKinds, 10 * 1024 * 1024, "PDF, JPG, or PNG");
  const filePath = await saveUpload(`exams/${entry.courseId}`, upload);
  try {
    const id = await transaction(async (tx) => {
      const componentId = await resolveComponent(tx, user.universityId!, data.componentId, "exam");
      const created = await tx.one<{ id: number }>(
        `INSERT INTO exams (course_id, group_id, timetable_entry_id, created_by, title, exam_date, starts_at, ends_at, file_name, file_path, file_type, file_size, points, component_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [entry.courseId, entry.groupId, entry.id, user.id, data.title, data.examDate, data.startsAt, data.endsAt, upload.name, filePath, upload.contentType, upload.size, data.points, componentId],
      );
      await notifyGroup(tx, entry.groupId, `New exam: ${data.title}`, `${entry.code} · ${data.examDate} · ${data.startsAt}–${data.endsAt}`, "/exams", user.id);
      return created!.id;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    await deleteUpload(filePath);
    throw error;
  }
});
