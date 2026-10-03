import "server-only";

import { db, type Db } from "@/lib/db";
import { HttpError } from "@/lib/http";

/** A (course, group) pair: one subject taught to one group. */
export type Offering = { courseId: number; courseCode: string; courseTitle: string; groupId: number; groupName: string; studentCount: number };

export const timetableColumns = `te.id, te.weekday, te.starts_at AS "startsAt", te.ends_at AS "endsAt", te.room,
  c.id AS "courseId", c.code, c.title, g.id AS "groupId", g.name AS "groupName", p.id AS "professorId", p.full_name AS "professorName"`;

export const timetableJoins = `FROM timetable_entries te
  JOIN courses c ON c.id = te.course_id
  JOIN groups g ON g.id = te.group_id
  JOIN users p ON p.id = c.professor_id`;

export function professorOfferings(professorId: number) {
  return db.many<Offering>(
    `SELECT c.id AS "courseId", c.code AS "courseCode", c.title AS "courseTitle", g.id AS "groupId", g.name AS "groupName",
            (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id) AS "studentCount"
       FROM courses c JOIN course_groups cg ON cg.course_id = c.id JOIN groups g ON g.id = cg.group_id
      WHERE c.professor_id = $1
      ORDER BY c.code, g.name`,
    [professorId],
  );
}

/** Throws 403 unless the professor owns the course and the course is offered to the group. */
export async function requireOwnedOffering(professorId: number, courseId: number, groupId: number, tx: Db = db) {
  const offering = await tx.one<{ courseCode: string; groupName: string }>(
    `SELECT c.code AS "courseCode", g.name AS "groupName"
       FROM course_groups cg JOIN courses c ON c.id = cg.course_id JOIN groups g ON g.id = cg.group_id
      WHERE cg.course_id = $1 AND cg.group_id = $2 AND c.professor_id = $3`,
    [courseId, groupId, professorId],
  );
  if (!offering) throw new HttpError(403, "You do not teach this subject to that group.");
  return offering;
}

export type HomeworkAccess = { id: number; title: string; courseId: number; courseCode: string; groupId: number; professorId: number; dueAt: string; points: number };

/** Loads a homework item the user may see: the owning professor, or a student in its group. Otherwise 404. */
export async function loadHomework(homeworkId: number, user: { id: number; role: string }) {
  const homework = await db.one<HomeworkAccess>(
    `SELECT h.id, h.title, h.course_id AS "courseId", c.code AS "courseCode", h.group_id AS "groupId", c.professor_id AS "professorId", h.due_at AS "dueAt", h.points
       FROM homework h JOIN courses c ON c.id = h.course_id WHERE h.id = $1`,
    [homeworkId],
  );
  const allowed = homework && (user.role === "professor" ? homework.professorId === user.id : user.role === "student" && await studentGroupId(user.id) === homework.groupId);
  if (!allowed) throw new HttpError(404, "Homework not found.");
  return homework;
}

export async function studentGroupId(studentId: number) {
  return (await db.one<{ groupId: number }>(`SELECT group_id AS "groupId" FROM enrollments WHERE student_id = $1`, [studentId]))?.groupId ?? null;
}

/** The subject's syllabus and plan: its professor may edit them; students in a group that takes the subject may read them. Otherwise 404. */
export async function requireCourseAccess(courseId: number, user: { id: number; role: string }, edit = false) {
  const course = await db.one<{ id: number; professorId: number }>(`SELECT id, professor_id AS "professorId" FROM courses WHERE id = $1`, [courseId]);
  const owner = course && user.role === "professor" && course.professorId === user.id;
  const enrolled = course && !edit && user.role === "student" && await db.one(`SELECT 1 FROM enrollments e JOIN course_groups cg ON cg.group_id = e.group_id WHERE e.student_id = $1 AND cg.course_id = $2`, [user.id, courseId]);
  if (!owner && !enrolled) throw new HttpError(404, "Subject not found.");
  return { canEdit: Boolean(owner) };
}
