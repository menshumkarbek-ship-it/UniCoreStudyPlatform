import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseErrorCode, db } from "@/lib/db";
import { HttpError, idSchema, readJson, requireUser, route } from "@/lib/http";
import { notifyGroup } from "@/lib/notifications";
import { isRateLimited, recordFailure } from "@/lib/rate-limit";
import { timetableColumns, timetableJoins } from "@/lib/teaching";
import { clockIn } from "@/lib/time";

export const runtime = "nodejs";

type Entry = { id: number; courseId: number; groupId: number; weekday: number; startsAt: string; endsAt: string };

function isInWindow(clock: ReturnType<typeof clockIn>, entry: { weekday: number; startsAt: string; endsAt: string }) {
  return clock.weekday === entry.weekday && clock.time >= entry.startsAt && clock.time <= entry.endsAt;
}

export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  const clock = clockIn(user.timezone);
  if (user.role === "professor") {
    const [entries, openSessions, history] = await Promise.all([
      db.many<Entry & Record<string, unknown>>(`SELECT ${timetableColumns} ${timetableJoins} WHERE c.professor_id = $1 ORDER BY te.weekday, te.starts_at`, [user.id]),
      db.many<{ timetableEntryId: number; code: string }>(`SELECT timetable_entry_id AS "timetableEntryId", code FROM attendance_sessions WHERE opened_by = $1 AND session_date = $2`, [user.id, clock.date]),
      db.many(
        `SELECT s.id, s.session_date AS "sessionDate", s.starts_at AS "startsAt", c.code AS "courseCode", c.title AS "courseTitle", g.name AS "groupName",
                (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = s.group_id) AS "enrolledCount",
                (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id) AS "attendedCount"
           FROM attendance_sessions s JOIN courses c ON c.id = s.course_id JOIN groups g ON g.id = s.group_id
          WHERE c.professor_id = $1
          ORDER BY s.session_date DESC, s.starts_at DESC
          LIMIT 100`,
        [user.id],
      ),
    ]);
    const codes = new Map(openSessions.map((session) => [session.timetableEntryId, session.code]));
    const schedule = entries.map((entry) => {
      const active = isInWindow(clock, entry);
      return { ...entry, active, attendanceCode: active ? codes.get(entry.id) ?? null : null };
    });
    return NextResponse.json({ schedule, history, today: clock.date });
  }
  const courses = await db.many<{ id: number; code: string; title: string; sessionCount: number; attendedCount: number }>(
    `SELECT c.id, c.code, c.title, COUNT(s.id) AS "sessionCount", COUNT(r.session_id) AS "attendedCount"
       FROM enrollments e
       JOIN attendance_sessions s ON s.group_id = e.group_id
       JOIN courses c ON c.id = s.course_id
       LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = e.student_id
      WHERE e.student_id = $1
      GROUP BY c.id
      ORDER BY c.code`,
    [user.id],
  );
  const totals = courses.reduce((sum, course) => ({ sessionCount: sum.sessionCount + course.sessionCount, attendedCount: sum.attendedCount + course.attendedCount }), { sessionCount: 0, attendedCount: 0 });
  return NextResponse.json({ courses, totals, today: clock.date });
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), timetableEntryId: idSchema }),
  z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/, "Enter the six-digit code.") }),
]);

export const POST = route(async (request) => {
  const user = await requireUser("professor", "student");
  const body = await readJson(request, actionSchema);
  const clock = clockIn(user.timezone);

  if (body.action === "start") {
    if (user.role !== "professor") throw new HttpError(403, "Only professors can start attendance.");
    const entry = await db.one<Entry & { courseCode: string }>(
      `SELECT te.id, te.course_id AS "courseId", te.group_id AS "groupId", te.weekday, te.starts_at AS "startsAt", te.ends_at AS "endsAt", c.code AS "courseCode"
         FROM timetable_entries te JOIN courses c ON c.id = te.course_id WHERE te.id = $1 AND c.professor_id = $2`,
      [body.timetableEntryId, user.id],
    );
    if (!entry) throw new HttpError(404, "Class not found in your timetable.");
    if (!isInWindow(clock, entry)) throw new HttpError(409, "Attendance can only be started during the scheduled class time.");
    const existing = await db.one<{ code: string }>("SELECT code FROM attendance_sessions WHERE timetable_entry_id = $1 AND session_date = $2", [entry.id, clock.date]);
    if (existing) return NextResponse.json({ code: existing.code });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      try {
        await db.run(
          "INSERT INTO attendance_sessions (course_id, group_id, timetable_entry_id, opened_by, session_date, code, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [entry.courseId, entry.groupId, entry.id, user.id, clock.date, code, entry.startsAt, entry.endsAt],
        );
        // The code itself stays out of the notification: students get it in class.
        await notifyGroup(db, entry.groupId, `Attendance open: ${entry.courseCode}`, `Check in with the code shown in class before ${entry.endsAt}.`, "/attendance", user.id);
        return NextResponse.json({ code }, { status: 201 });
      } catch (error) {
        if (databaseErrorCode(error) !== "23505") throw error;
        const raced = await db.one<{ code: string }>("SELECT code FROM attendance_sessions WHERE timetable_entry_id = $1 AND session_date = $2", [entry.id, clock.date]);
        if (raced) return NextResponse.json({ code: raced.code });
      }
    }
    throw new HttpError(503, "Could not generate an attendance code. Please try again.");
  }

  if (user.role !== "student") throw new HttpError(403, "Only students can verify attendance.");
  const bucket = `attendance:${user.id}`;
  if (await isRateLimited(bucket, 10, 10 * 60)) throw new HttpError(429, "Too many incorrect codes. Try again in 10 minutes.");
  // One lookup that requires the code, today's date, the student's own group, and the class window,
  // so a wrong code and another group's code produce the same answer.
  const session = await db.one<{ id: number; courseCode: string; startsAt: string; endsAt: string }>(
    `SELECT s.id, c.code AS "courseCode", s.starts_at AS "startsAt", s.ends_at AS "endsAt"
       FROM attendance_sessions s JOIN courses c ON c.id = s.course_id JOIN enrollments e ON e.group_id = s.group_id AND e.student_id = $3
      WHERE s.code = $1 AND s.session_date = $2`,
    [body.code, clock.date, user.id],
  );
  if (!session || clock.time < session.startsAt || clock.time > session.endsAt) {
    await recordFailure(bucket);
    throw new HttpError(409, "That code is not active for any of your classes right now.");
  }
  await db.run("INSERT INTO attendance_records (session_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [session.id, user.id]);
  return NextResponse.json({ message: `Attendance recorded for ${session.courseCode}.` });
});
