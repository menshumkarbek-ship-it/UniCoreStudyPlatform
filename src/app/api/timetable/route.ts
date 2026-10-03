import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, route } from "@/lib/http";
import { timetableColumns, timetableJoins } from "@/lib/teaching";

export const runtime = "nodejs";

// A professor's timetable is every class of the courses they own; a student's is their group's classes.
export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  const entries = await db.many(
    `SELECT ${timetableColumns} ${timetableJoins}
      WHERE ${user.role === "professor" ? "c.professor_id = $1" : "te.group_id = (SELECT group_id FROM enrollments WHERE student_id = $1)"}
      ORDER BY te.weekday, te.starts_at`,
    [user.id],
  );
  return NextResponse.json({ entries });
});
