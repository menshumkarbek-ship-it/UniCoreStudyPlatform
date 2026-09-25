import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { notifyGroup } from "@/lib/notifications";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "application/pdf"]);
const maxFileSize = 10 * 1024 * 1024;

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59 ? hours * 60 + mins : -1;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const database = getDatabase();
  if (session.role === "professor") {
    const entries = database.prepare("SELECT te.id, te.weekday, te.starts_at AS startsAt, te.ends_at AS endsAt, c.code, c.title, g.name AS groupName FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id WHERE te.professor_id = ? ORDER BY te.weekday, te.starts_at").all(session.userId);
    const exams = database.prepare("SELECT e.id, e.title, e.exam_date AS examDate, e.starts_at AS startsAt, e.ends_at AS endsAt, e.file_name AS fileName, c.code, c.title AS courseTitle, g.name AS groupName FROM exams e JOIN courses c ON c.id = e.course_id JOIN groups g ON g.id = e.group_id WHERE e.created_by = ? ORDER BY e.exam_date, e.starts_at").all(session.userId);
    return NextResponse.json({ entries, exams });
  }
  const exams = database.prepare("SELECT e.id, e.title, e.exam_date AS examDate, e.starts_at AS startsAt, e.ends_at AS endsAt, e.file_name AS fileName, c.code, c.title AS courseTitle, g.name AS groupName FROM exams e JOIN courses c ON c.id = e.course_id JOIN groups g ON g.id = e.group_id JOIN enrollments en ON en.group_id = e.group_id WHERE en.user_id = ? ORDER BY e.exam_date, e.starts_at").all(session.userId);
  return NextResponse.json({ exams });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Professor access required." }, { status: 403 });
  const formData = await request.formData();
  const timetableEntryId = Number(formData.get("timetableEntryId"));
  const title = String(formData.get("title") ?? "").trim();
  const examDate = String(formData.get("examDate") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const file = formData.get("file");
  if (!Number.isInteger(timetableEntryId) || !title || title.length > 200 || !validDate(examDate) || !/^\d{2}:\d{2}$/.test(startsAt) || !/^\d{2}:\d{2}$/.test(endsAt)) return NextResponse.json({ error: "Enter a title, date, and valid exam time." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a JPG or PDF file with the exam questions." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Only JPG and PDF files are accepted." }, { status: 415 });
  if (file.size > maxFileSize) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  const database = getDatabase();
  const entry = database.prepare("SELECT id, course_id AS courseId, group_id AS groupId, weekday, starts_at AS classStartsAt, ends_at AS classEndsAt FROM timetable_entries WHERE id = ? AND professor_id = ?").get(timetableEntryId, session.userId) as { id: number; courseId: number; groupId: number; weekday: number; classStartsAt: string; classEndsAt: string } | undefined;
  if (!entry) return NextResponse.json({ error: "Select one of your scheduled classes." }, { status: 404 });
  const selectedDate = new Date(`${examDate}T12:00:00`);
  if (examDate < new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: "The exam date must be today or a future class date." }, { status: 409 });
  if (selectedDate.getDay() !== entry.weekday) return NextResponse.json({ error: "The exam date must fall on the selected class day." }, { status: 409 });
  const classStart = minutes(entry.classStartsAt);
  const classEnd = minutes(entry.classEndsAt);
  const examStart = minutes(startsAt);
  const examEnd = minutes(endsAt);
  if (classStart < 0 || classEnd < 0 || examStart < 0 || examEnd < 0 || examStart < classStart || examEnd > classEnd || examEnd <= examStart) return NextResponse.json({ error: `Exam time must fit inside the class window (${entry.classStartsAt}-${entry.classEndsAt}).` }, { status: 409 });
  const extension = file.type === "application/pdf" ? ".pdf" : ".jpg";
  const relativePath = path.join("exams", `${timetableEntryId}-${session.userId}-${Date.now()}${extension}`);
  const absolutePath = path.join(process.cwd(), "data", "uploads", relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  const result = database.prepare("INSERT INTO exams (course_id, group_id, timetable_entry_id, created_by, title, exam_date, starts_at, ends_at, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(entry.courseId, entry.groupId, entry.id, session.userId, title, examDate, startsAt, endsAt, file.name, relativePath, file.type, file.size);
  const course = database.prepare("SELECT code FROM courses WHERE id = ?").get(entry.courseId) as { code: string };
  notifyGroup(database, entry.groupId, `New exam: ${title}`, `${course.code} · ${examDate} · ${startsAt}-${endsAt}`, "/exams");
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
