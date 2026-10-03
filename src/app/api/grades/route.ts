import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gradingScheme, scoredItems, scoreSubject } from "@/lib/grading";
import { requireUser, route } from "@/lib/http";
import { professorOfferings } from "@/lib/teaching";

export const runtime = "nodejs";

type Course = { id: number; code: string; title: string; professorName: string };

// Scores come from the university's grading scheme (set in the admin panel): each component's weight times the
// student's average percentage over the homework and exams that count toward it.
export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  const components = await gradingScheme(user.universityId!);

  if (user.role === "student") {
    const items = await scoredItems([user.id]);
    // The group's subjects, plus any subject with work graded in a previous group.
    const courses = await db.many<Course>(
      `SELECT c.id, c.code, c.title, p.full_name AS "professorName" FROM courses c JOIN users p ON p.id = c.professor_id
        WHERE c.id IN (SELECT cg.course_id FROM enrollments e JOIN course_groups cg ON cg.group_id = e.group_id WHERE e.student_id = $1)
           OR c.id = ANY($2::bigint[])
        ORDER BY c.code`,
      [user.id, [...new Set(items.map((item) => item.courseId))]],
    );
    const subjects = courses.map((course) => {
      const own = items.filter((item) => item.courseId === course.id);
      return { ...course, score: scoreSubject(components, own), items: own };
    });
    return NextResponse.json({ components, subjects });
  }

  const offerings = await professorOfferings(user.id);
  const groupIds = [...new Set(offerings.map((offering) => offering.groupId))];
  const [roster, awaiting] = await Promise.all([
    db.many<{ studentId: number; groupId: number; studentName: string; studentNumber: string | null }>(
      `SELECT e.student_id AS "studentId", e.group_id AS "groupId", u.full_name AS "studentName", u.student_number AS "studentNumber"
         FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.group_id = ANY($1::bigint[]) ORDER BY u.full_name`,
      [groupIds],
    ),
    db.many<{ courseId: number; groupId: number; count: number }>(
      `SELECT h.course_id AS "courseId", h.group_id AS "groupId", COUNT(*) AS count
         FROM homework_submissions s JOIN homework h ON h.id = s.homework_id JOIN courses c ON c.id = h.course_id
        WHERE c.professor_id = $1 AND s.status = 'submitted' GROUP BY h.course_id, h.group_id`,
      [user.id],
    ),
  ]);
  const items = roster.length ? await scoredItems(roster.map((student) => student.studentId), [...new Set(offerings.map((offering) => offering.courseId))]) : [];
  const result = offerings.map((offering) => {
    const students = roster.filter((student) => student.groupId === offering.groupId).map((student) => ({
      ...student,
      score: scoreSubject(components, items.filter((item) => item.studentId === student.studentId && item.courseId === offering.courseId)),
    }));
    const percents = students.flatMap((student) => student.score.percent === null ? [] : [student.score.percent]);
    return {
      ...offering,
      awaitingCount: awaiting.find((row) => row.courseId === offering.courseId && row.groupId === offering.groupId)?.count ?? 0,
      averagePercent: percents.length ? percents.reduce((sum, percent) => sum + percent, 0) / percents.length : null,
      students,
    };
  });
  return NextResponse.json({ components, offerings: result });
});
