import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  if (user.role === "professor") {
    const courses = await db.many(
      `SELECT c.id, c.code, c.title, f.name AS "facultyName",
              COALESCE(json_agg(json_build_object('id', g.id, 'name', g.name, 'studentCount', (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id)) ORDER BY g.name) FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
         FROM courses c
         LEFT JOIN faculties f ON f.id = c.faculty_id
         LEFT JOIN course_groups cg ON cg.course_id = c.id
         LEFT JOIN groups g ON g.id = cg.group_id
        WHERE c.professor_id = $1
        GROUP BY c.id, f.name
        ORDER BY c.code`,
      [user.id],
    );
    return NextResponse.json({ courses });
  }
  const courses = await db.many(
    `SELECT c.id, c.code, c.title, f.name AS "facultyName", p.id AS "professorId", p.full_name AS "professorName", p.email AS "professorEmail"
       FROM enrollments e
       JOIN course_groups cg ON cg.group_id = e.group_id
       JOIN courses c ON c.id = cg.course_id
       JOIN users p ON p.id = c.professor_id
       LEFT JOIN faculties f ON f.id = c.faculty_id
      WHERE e.student_id = $1
      ORDER BY c.code`,
    [user.id],
  );
  return NextResponse.json({ courses });
});
