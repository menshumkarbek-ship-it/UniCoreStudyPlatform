import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

/** Academic placement for the profile and dashboard: a student's group and faculty, a professor's faculties. */
export const GET = route(async () => {
  const user = await requireUser();
  if (user.role === "student") {
    const placement = await db.one<{ groupId: number; groupName: string; facultyName: string }>(
      `SELECT g.id AS "groupId", g.name AS "groupName", f.name AS "facultyName"
         FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN faculties f ON f.id = g.faculty_id
        WHERE e.student_id = $1`,
      [user.id],
    );
    return NextResponse.json({ user, placement: placement ?? null });
  }
  if (user.role === "professor") {
    const faculties = await db.many<{ name: string }>(
      "SELECT DISTINCT f.name FROM courses c JOIN faculties f ON f.id = c.faculty_id WHERE c.professor_id = $1 ORDER BY f.name",
      [user.id],
    );
    return NextResponse.json({ user, faculties: faculties.map((faculty) => faculty.name) });
  }
  return NextResponse.json({ user });
});
