import "server-only";

import { db, type Db } from "@/lib/db";
import { HttpError } from "@/lib/http";

/**
 * One weighted part of a subject's final score, set per university in the admin panel. `defaultHomework` and
 * `defaultExams` mark where new homework and new exams count unless the professor picks another component.
 */
export type GradingComponent = { id: number; name: string; weight: number; position: number; defaultHomework: boolean; defaultExams: boolean };

/** A student's standing in one component: the average percentage over the items that count so far. */
export type ComponentResult = { componentId: number; itemCount: number; countedCount: number; averagePercent: number | null; earned: number | null };

/** A student's score in one subject, out of 100 points. `possible` is the weight of the components assessed so far. */
export type SubjectScore = { earned: number; possible: number; percent: number | null; components: ComponentResult[] };

/** One graded or pending piece of work behind a score, for the detail view. */
export type ScoredItem = { kind: "homework" | "exam"; id: number; courseId: number; componentId: number; title: string; points: number; earned: number | null; state: "graded" | "missed" | "pending"; at: string };

export const defaultComponents = [
  { name: "Homework", weight: 30, defaultHomework: true, defaultExams: false },
  { name: "Midterm exam", weight: 20, defaultHomework: false, defaultExams: false },
  { name: "Final exam", weight: 20, defaultHomework: false, defaultExams: false },
  { name: "Exams", weight: 30, defaultHomework: false, defaultExams: true },
] as const;

export async function createDefaultScheme(tx: Db, universityId: number) {
  for (const [index, component] of defaultComponents.entries()) {
    await tx.run("INSERT INTO grading_components (university_id, name, weight, position, default_homework, default_exams) VALUES ($1, $2, $3, $4, $5, $6)", [universityId, component.name, component.weight, index + 1, component.defaultHomework, component.defaultExams]);
  }
}

export function gradingScheme(universityId: number, tx: Db = db) {
  return tx.many<GradingComponent>(
    `SELECT id, name, weight, position, default_homework AS "defaultHomework", default_exams AS "defaultExams" FROM grading_components WHERE university_id = $1 ORDER BY position, id`,
    [universityId],
  );
}

/**
 * The component new work goes into: the one the professor picked, if it belongs to this university, otherwise the
 * university's default for that kind of work (or its first component, if no default is set).
 */
export async function resolveComponent(tx: Db, universityId: number, componentId: number | null | undefined, fallback: "homework" | "exam") {
  const component = componentId
    ? await tx.one<{ id: number }>("SELECT id FROM grading_components WHERE id = $1 AND university_id = $2", [componentId, universityId])
    : await tx.one<{ id: number }>(
      `SELECT id FROM grading_components WHERE university_id = $1 ORDER BY ${fallback === "homework" ? "default_homework" : "default_exams"} DESC, position, id LIMIT 1`,
      [universityId],
    );
  if (!component) throw new HttpError(400, "Choose what this counts toward.");
  return component.id;
}

/**
 * Every assessed item for each student: the homework and exams of the student's group, plus anything already graded
 * from a previous group. Homework counts once graded, or as 0 once its deadline passes without a submission;
 * submitted-but-ungraded homework and exams without a result do not count yet.
 */
export function scoredItems(studentIds: number[], courseIds: number[] | null = null) {
  return db.many<ScoredItem & { studentId: number }>(
    `WITH students AS (SELECT s.student_id, e.group_id FROM unnest($1::bigint[]) AS s (student_id) LEFT JOIN enrollments e ON e.student_id = s.student_id)
     SELECT s.student_id AS "studentId", 'homework' AS kind, h.id, h.course_id AS "courseId", h.component_id AS "componentId", h.title, h.points,
            CASE WHEN hs.status = 'graded' THEN hs.grade WHEN hs.id IS NULL AND h.due_at <= now() THEN 0 END AS earned,
            CASE WHEN hs.status = 'graded' THEN 'graded' WHEN hs.id IS NULL AND h.due_at <= now() THEN 'missed' ELSE 'pending' END AS state,
            h.due_at AS at
       FROM students s
       JOIN homework h ON h.group_id = s.group_id
                       OR EXISTS (SELECT 1 FROM homework_submissions g WHERE g.homework_id = h.id AND g.student_id = s.student_id AND g.status = 'graded')
       LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = s.student_id
      WHERE $2::bigint[] IS NULL OR h.course_id = ANY($2::bigint[])
     UNION ALL
     SELECT s.student_id, 'exam', x.id, x.course_id, x.component_id, x.title, x.points, r.score,
            CASE WHEN r.score IS NULL THEN 'pending' ELSE 'graded' END,
            (x.exam_date + x.starts_at)::timestamp AT TIME ZONE 'UTC'
       FROM students s
       JOIN exams x ON x.group_id = s.group_id OR EXISTS (SELECT 1 FROM exam_results g WHERE g.exam_id = x.id AND g.student_id = s.student_id)
       LEFT JOIN exam_results r ON r.exam_id = x.id AND r.student_id = s.student_id
      WHERE $2::bigint[] IS NULL OR x.course_id = ANY($2::bigint[])
      ORDER BY at`,
    [studentIds, courseIds],
  );
}

/**
 * Turns one student's items in one subject into a score. Within a component every item weighs the same, so a component
 * with one homework gives that homework the component's whole weight. A component with nothing counted yet is left out
 * of `possible`, so `percent` is the standing on what has been assessed so far.
 */
export function scoreSubject(scheme: GradingComponent[], items: ScoredItem[]): SubjectScore {
  const components = scheme.map((component) => {
    const own = items.filter((item) => item.componentId === component.id);
    const counted = own.filter((item) => item.earned !== null);
    const averagePercent = counted.length ? counted.reduce((sum, item) => sum + item.earned! / item.points * 100, 0) / counted.length : null;
    return { componentId: component.id, itemCount: own.length, countedCount: counted.length, averagePercent, earned: averagePercent === null ? null : averagePercent * component.weight / 100 };
  });
  const earned = components.reduce((sum, component) => sum + (component.earned ?? 0), 0);
  const possible = scheme.reduce((sum, component, index) => sum + (components[index].averagePercent === null ? 0 : component.weight), 0);
  return { earned, possible, percent: possible ? earned / possible * 100 : null, components };
}
