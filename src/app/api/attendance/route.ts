import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

type TimetableEntry = { id: number; courseId: number; groupId: number; code: string; title: string; groupName: string; weekday: number; startsAt: string; endsAt: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function minutes(value: string) {
  const [hours, minutesValue] = value.split(":").map(Number);
  return hours * 60 + minutesValue;
}

function isActiveWindow(entry: { weekday: number; startsAt: string; endsAt: string }) {
  const now = new Date();
  return now.getDay() === entry.weekday && now.getHours() * 60 + now.getMinutes() >= minutes(entry.startsAt) && now.getHours() * 60 + now.getMinutes() <= minutes(entry.endsAt);
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function attendanceStartDate(database: ReturnType<typeof getDatabase>, session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  if (session.role === "professor") {
    return (database.prepare("SELECT MIN(attendance_date) AS startDate FROM attendance_sessions WHERE professor_id = ?").get(session.userId) as { startDate: string | null }).startDate;
  }
  return (database.prepare("SELECT MIN(s.attendance_date) AS startDate FROM attendance_sessions s JOIN enrollments e ON e.group_id = s.group_id WHERE e.user_id = ?").get(session.userId) as { startDate: string | null }).startDate;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  const currentDate = today();
  const startDate = attendanceStartDate(database, session);

  if (session.role === "professor") {
    const schedule = database.prepare("SELECT te.id, te.course_id AS courseId, te.group_id AS groupId, c.code, c.title, g.name AS groupName, te.weekday, te.starts_at AS startsAt, te.ends_at AS endsAt FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id WHERE te.professor_id = ? ORDER BY te.weekday, te.starts_at").all(session.userId) as TimetableEntry[];
    const history = database.prepare("SELECT s.id, s.attendance_date AS attendanceDate, s.code, s.starts_at AS startsAt, s.ends_at AS endsAt, c.code AS courseCode, c.title AS courseTitle, g.name AS groupName, COUNT(DISTINCT e.user_id) AS enrolledCount, COUNT(DISTINCT r.student_id) AS attendedCount FROM attendance_sessions s JOIN courses c ON c.id = s.course_id JOIN groups g ON g.id = s.group_id LEFT JOIN enrollments e ON e.group_id = s.group_id LEFT JOIN attendance_records r ON r.session_id = s.id WHERE s.professor_id = ? GROUP BY s.id ORDER BY s.attendance_date DESC, s.starts_at DESC").all(session.userId);
    return NextResponse.json({ schedule, history, attendanceStartDate: startDate, today: currentDate });
  }

  const courses = database.prepare("SELECT c.id, c.code, c.title, COUNT(DISTINCT s.id) AS sessionCount, COUNT(DISTINCT r.id) AS attendedCount FROM enrollments e JOIN attendance_sessions s ON s.group_id = e.group_id AND s.attendance_date <= ? JOIN courses c ON c.id = s.course_id LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = ? WHERE e.user_id = ? GROUP BY c.id, c.code, c.title ORDER BY c.code").all(currentDate, session.userId, session.userId);
  const totals = database.prepare("SELECT COUNT(DISTINCT s.id) AS sessionCount, COUNT(DISTINCT r.id) AS attendedCount FROM enrollments e JOIN attendance_sessions s ON s.group_id = e.group_id AND s.attendance_date <= ? LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = ? WHERE e.user_id = ?").get(currentDate, session.userId, session.userId);
  return NextResponse.json({ courses, totals, attendanceStartDate: startDate, today: currentDate });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; timetableEntryId?: number; code?: string } | null;
  const database = getDatabase();

  if (session.role === "professor" && body?.action === "start") {
    const timetableEntryId = Number(body.timetableEntryId);
    const entry = database.prepare("SELECT te.id, te.course_id AS courseId, te.group_id AS groupId, te.weekday, te.starts_at AS startsAt, te.ends_at AS endsAt FROM timetable_entries te WHERE te.id = ? AND te.professor_id = ?").get(timetableEntryId, session.userId) as { id: number; courseId: number; groupId: number; weekday: number; startsAt: string; endsAt: string } | undefined;
    if (!entry) return NextResponse.json({ error: "Class schedule not found." }, { status: 404 });
    if (!isActiveWindow(entry)) return NextResponse.json({ error: "Attendance can only start during the scheduled class time." }, { status: 409 });
    const existing = database.prepare("SELECT id, code FROM attendance_sessions WHERE course_id = ? AND group_id = ? AND attendance_date = ?").get(entry.courseId, entry.groupId, today()) as { id: number; code: string } | undefined;
    if (existing) return NextResponse.json({ sessionId: existing.id, code: existing.code });
    let code = randomCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const result = database.prepare("INSERT INTO attendance_sessions (course_id, group_id, professor_id, attendance_date, code, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(entry.courseId, entry.groupId, session.userId, today(), code, entry.startsAt, entry.endsAt);
        return NextResponse.json({ sessionId: result.lastInsertRowid, code }, { status: 201 });
      } catch (error) {
        if (!String(error).includes("UNIQUE constraint failed")) throw error;
        code = randomCode();
      }
    }
    return NextResponse.json({ error: "Could not generate an attendance code." }, { status: 409 });
  }

  if (session.role === "student" && body?.code && /^\d{6}$/.test(body.code)) {
    const attendanceSession = database.prepare("SELECT id, group_id AS groupId, starts_at AS startsAt, ends_at AS endsAt FROM attendance_sessions WHERE code = ? AND attendance_date = ?").get(body.code, today()) as { id: number; groupId: number; startsAt: string; endsAt: string } | undefined;
    if (!attendanceSession || !isActiveWindow({ weekday: new Date().getDay(), startsAt: attendanceSession.startsAt, endsAt: attendanceSession.endsAt })) return NextResponse.json({ error: "That attendance code is not active." }, { status: 409 });
    const enrollment = database.prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND group_id = ?").get(session.userId, attendanceSession.groupId);
    if (!enrollment) return NextResponse.json({ error: "You are not enrolled in this class." }, { status: 403 });
    database.prepare("INSERT OR IGNORE INTO attendance_records (session_id, student_id) VALUES (?, ?)").run(attendanceSession.id, session.userId);
    return NextResponse.json({ message: "Attendance verified." });
  }

  return NextResponse.json({ error: "Invalid attendance request." }, { status: 400 });
}
