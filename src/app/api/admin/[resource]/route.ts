import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

const resourceNames = ["universities", "faculties", "students", "professors", "subjects", "groups", "enrollments", "teaching-assignments", "timetable"] as const;
type Resource = typeof resourceNames[number];
const userSchema = z.object({ universityId: z.coerce.number().int().positive(), email: z.string().trim().email().max(160), fullName: z.string().trim().min(1).max(160), password: z.string().min(8).max(200), role: z.enum(["student", "professor"]), studentId: z.string().trim().max(80).optional() });
const userUpdateSchema = userSchema.partial().extend({ password: z.string().min(8).max(200).optional() });
const universitySchema = z.object({ name: z.string().trim().min(1).max(200), city: z.string().trim().min(1).max(120) });
const facultySchema = z.object({ universityId: z.coerce.number().int().positive(), name: z.string().trim().min(1).max(160) });
const subjectSchema = z.object({ universityId: z.coerce.number().int().positive(), facultyId: z.union([z.coerce.number().int().positive(), z.null()]).optional(), professorIds: z.array(z.coerce.number().int().positive()).default([]), code: z.string().trim().min(1).max(40), title: z.string().trim().min(1).max(200) });
const groupSchema = z.object({ universityId: z.coerce.number().int().positive(), name: z.string().trim().min(1).max(120) });
const enrollmentSchema = z.object({ studentId: z.coerce.number().int().positive(), groupId: z.coerce.number().int().positive() });
const assignmentSchema = z.object({ professorId: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive(), groupId: z.coerce.number().int().positive() });
const timetableSchema = z.object({ universityId: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive(), groupId: z.coerce.number().int().positive(), professorId: z.coerce.number().int().positive(), weekday: z.coerce.number().int().min(0).max(6), startsAt: z.string().trim().min(1).max(10), endsAt: z.string().trim().min(1).max(10), room: z.string().trim().min(1).max(120) });

function errorResponse(error: unknown) {
  const message = String(error);
  if (message.includes("UNIQUE constraint failed")) return NextResponse.json({ error: "That record already exists." }, { status: 409 });
  if (message.includes("FOREIGN KEY constraint failed") || message.includes("NOT NULL constraint failed")) return NextResponse.json({ error: "That change conflicts with related records." }, { status: 409 });
  return NextResponse.json({ error: "Unable to complete that change." }, { status: 400 });
}

function validResource(value: string): Resource | null {
  return resourceNames.includes(value as Resource) ? value as Resource : null;
}

function isPeopleResource(resource: Resource) {
  return resource === "students" || resource === "professors";
}

function listRows(resource: Resource) {
  const database = getDatabase();
  if (resource === "universities") return database.prepare("SELECT id, name, city, created_at AS createdAt FROM universities ORDER BY name").all();
  if (resource === "faculties") return database.prepare("SELECT faculties.id, faculties.university_id AS universityId, faculties.name, universities.name AS universityName FROM faculties JOIN universities ON universities.id = faculties.university_id ORDER BY faculties.name").all();
  if (isPeopleResource(resource)) return database.prepare("SELECT users.id, users.university_id AS universityId, users.email, users.full_name AS fullName, users.role, users.student_id AS studentId, universities.name AS universityName FROM users JOIN universities ON universities.id = users.university_id WHERE users.role = ? ORDER BY users.full_name").all(resource === "students" ? "student" : "professor");
  if (resource === "subjects") return database.prepare("SELECT courses.id, courses.university_id AS universityId, courses.faculty_id AS facultyId, courses.code, courses.title, faculties.name AS facultyName, universities.name AS universityName, GROUP_CONCAT(course_professors.professor_id) AS professorIds, GROUP_CONCAT(professors.full_name, ', ') AS professorNames FROM courses JOIN universities ON universities.id = courses.university_id LEFT JOIN faculties ON faculties.id = courses.faculty_id LEFT JOIN course_professors ON course_professors.course_id = courses.id LEFT JOIN users professors ON professors.id = course_professors.professor_id GROUP BY courses.id ORDER BY courses.code").all();
  if (resource === "groups") return database.prepare("SELECT groups.id, groups.university_id AS universityId, groups.name, universities.name AS universityName FROM groups JOIN universities ON universities.id = groups.university_id ORDER BY groups.name").all();
  if (resource === "enrollments") return database.prepare("SELECT enrollments.rowid AS id, enrollments.user_id AS studentId, enrollments.group_id AS groupId, users.full_name AS studentName, groups.name AS groupName, universities.name AS universityName FROM enrollments JOIN users ON users.id = enrollments.user_id JOIN groups ON groups.id = enrollments.group_id JOIN universities ON universities.id = groups.university_id ORDER BY studentName").all();
  if (resource === "teaching-assignments") return database.prepare("SELECT teaching_assignments.rowid AS id, teaching_assignments.professor_id AS professorId, teaching_assignments.course_id AS courseId, teaching_assignments.group_id AS groupId, professors.full_name AS professorName, courses.code, courses.title, groups.name AS groupName, universities.name AS universityName FROM teaching_assignments JOIN users professors ON professors.id = teaching_assignments.professor_id JOIN courses ON courses.id = teaching_assignments.course_id JOIN groups ON groups.id = teaching_assignments.group_id JOIN universities ON universities.id = courses.university_id ORDER BY professorName, code").all();
  return database.prepare("SELECT timetable_entries.id, timetable_entries.university_id AS universityId, timetable_entries.course_id AS courseId, timetable_entries.group_id AS groupId, timetable_entries.professor_id AS professorId, timetable_entries.weekday, timetable_entries.starts_at AS startsAt, timetable_entries.ends_at AS endsAt, timetable_entries.room, courses.code, groups.name AS groupName, professors.full_name AS professorName, universities.name AS universityName FROM timetable_entries JOIN courses ON courses.id = timetable_entries.course_id JOIN groups ON groups.id = timetable_entries.group_id JOIN users professors ON professors.id = timetable_entries.professor_id JOIN universities ON universities.id = timetable_entries.university_id ORDER BY weekday, startsAt").all();
}

function sameUniversity(database: ReturnType<typeof getDatabase>, records: { table: "users" | "courses" | "groups"; id: number }[]) {
  const rows = records.map(({ table, id }) => database.prepare(`SELECT university_id AS universityId FROM ${table} WHERE id = ?`).get(id)) as ({ universityId: number } | undefined)[];
  return rows.every((row) => row) && new Set(rows.map((row) => row?.universityId)).size === 1;
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const resource = validResource((await params).resource);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  return NextResponse.json({ items: listRows(resource) });
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const resource = validResource((await params).resource);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const database = getDatabase();
  try {
    if (resource === "universities") { const data = universitySchema.parse(body); database.prepare("INSERT INTO universities (name, city) VALUES (?, ?)").run(data.name, data.city); }
    if (resource === "faculties") { const data = facultySchema.parse(body); database.prepare("INSERT INTO faculties (university_id, name) VALUES (?, ?)").run(data.universityId, data.name); }
    if (isPeopleResource(resource)) { const data = userSchema.parse({ ...body, role: resource === "students" ? "student" : "professor" }); database.prepare("INSERT INTO users (university_id, email, full_name, password_hash, role, student_id) VALUES (?, ?, ?, ?, ?, ?)").run(data.universityId, data.email.toLowerCase(), data.fullName, hashSync(data.password, 12), data.role, data.role === "student" ? data.studentId ?? null : null); }
    if (resource === "subjects") { const data = subjectSchema.parse(body); if (data.facultyId && database.prepare("SELECT university_id FROM faculties WHERE id = ? AND university_id = ?").get(data.facultyId, data.universityId) === undefined) throw new Error("Invalid faculty relationship"); if (data.professorIds.length && database.prepare(`SELECT COUNT(*) AS count FROM users WHERE id IN (${data.professorIds.map(() => "?").join(",")}) AND university_id = ? AND role = 'professor'`).get(...data.professorIds, data.universityId)?.count !== data.professorIds.length) throw new Error("Invalid professor relationship"); const result = database.prepare("INSERT INTO courses (university_id, faculty_id, code, title) VALUES (?, ?, ?, ?)").run(data.universityId, data.facultyId ?? null, data.code.toUpperCase(), data.title); for (const professorId of data.professorIds) database.prepare("INSERT INTO course_professors (course_id, professor_id) VALUES (?, ?)").run(result.lastInsertRowid, professorId); }
    if (resource === "groups") { const data = groupSchema.parse(body); database.prepare("INSERT INTO groups (university_id, name) VALUES (?, ?)").run(data.universityId, data.name); }
    if (resource === "enrollments") { const data = enrollmentSchema.parse(body); if (!sameUniversity(database, [{ table: "users", id: data.studentId }, { table: "groups", id: data.groupId }]) || database.prepare("SELECT role FROM users WHERE id = ?").get(data.studentId)?.role !== "student") throw new Error("Invalid enrollment relationship"); database.prepare("INSERT INTO enrollments (user_id, group_id) VALUES (?, ?)").run(data.studentId, data.groupId); }
    if (resource === "teaching-assignments") { const data = assignmentSchema.parse(body); if (!sameUniversity(database, [{ table: "users", id: data.professorId }, { table: "courses", id: data.courseId }, { table: "groups", id: data.groupId }]) || database.prepare("SELECT role FROM users WHERE id = ?").get(data.professorId)?.role !== "professor") throw new Error("Invalid teaching relationship"); database.prepare("INSERT INTO teaching_assignments (professor_id, course_id, group_id) VALUES (?, ?, ?)").run(data.professorId, data.courseId, data.groupId); }
    if (resource === "timetable") { const data = timetableSchema.parse(body); if (!sameUniversity(database, [{ table: "courses", id: data.courseId }, { table: "groups", id: data.groupId }, { table: "users", id: data.professorId }])) throw new Error("Invalid timetable relationship"); database.prepare("INSERT INTO timetable_entries (university_id, course_id, group_id, professor_id, weekday, starts_at, ends_at, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(data.universityId, data.courseId, data.groupId, data.professorId, data.weekday, data.startsAt, data.endsAt, data.room); }
    return NextResponse.json({ items: listRows(resource) }, { status: 201 });
  } catch (error) { return error instanceof z.ZodError ? NextResponse.json({ error: "Enter valid values for every required field." }, { status: 400 }) : errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const resource = validResource((await params).resource);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  const body = await request.json().catch(() => null) as { id?: number } | null;
  if (!body?.id) return NextResponse.json({ error: "A record ID is required." }, { status: 400 });
  const database = getDatabase();
  try {
    if (resource === "universities") { const data = universitySchema.parse(body); database.prepare("UPDATE universities SET name = ?, city = ? WHERE id = ?").run(data.name, data.city, body.id); }
    if (resource === "faculties") { const data = facultySchema.parse(body); database.prepare("UPDATE faculties SET university_id = ?, name = ? WHERE id = ?").run(data.universityId, data.name, body.id); }
    if (isPeopleResource(resource)) { const data = userUpdateSchema.parse({ ...body, role: resource === "students" ? "student" : "professor" }); const fields = [data.universityId, data.email?.toLowerCase(), data.fullName, data.role, data.studentId ?? null, body.id]; const passwordPart = data.password ? ", password_hash = ?" : ""; database.prepare(`UPDATE users SET university_id = COALESCE(?, university_id), email = COALESCE(?, email), full_name = COALESCE(?, full_name), role = COALESCE(?, role), student_id = ?${passwordPart} WHERE id = ?`).run(...(data.password ? [data.universityId, data.email?.toLowerCase(), data.fullName, data.role, data.studentId ?? null, hashSync(data.password, 12), body.id] : fields)); }
    if (resource === "subjects") { const data = subjectSchema.parse(body); if (data.facultyId && database.prepare("SELECT university_id FROM faculties WHERE id = ? AND university_id = ?").get(data.facultyId, data.universityId) === undefined) throw new Error("Invalid faculty relationship"); if (data.professorIds.length && database.prepare(`SELECT COUNT(*) AS count FROM users WHERE id IN (${data.professorIds.map(() => "?").join(",")}) AND university_id = ? AND role = 'professor'`).get(...data.professorIds, data.universityId)?.count !== data.professorIds.length) throw new Error("Invalid professor relationship"); database.prepare("UPDATE courses SET university_id = ?, faculty_id = ?, code = ?, title = ? WHERE id = ?").run(data.universityId, data.facultyId ?? null, data.code.toUpperCase(), data.title, body.id); database.prepare("DELETE FROM course_professors WHERE course_id = ?").run(body.id); for (const professorId of data.professorIds) database.prepare("INSERT INTO course_professors (course_id, professor_id) VALUES (?, ?)").run(body.id, professorId); }
    if (resource === "groups") { const data = groupSchema.parse(body); database.prepare("UPDATE groups SET university_id = ?, name = ? WHERE id = ?").run(data.universityId, data.name, body.id); }
    if (resource === "enrollments") { const data = enrollmentSchema.parse(body); if (!sameUniversity(database, [{ table: "users", id: data.studentId }, { table: "groups", id: data.groupId }]) || database.prepare("SELECT role FROM users WHERE id = ?").get(data.studentId)?.role !== "student") throw new Error("Invalid enrollment relationship"); database.prepare("UPDATE enrollments SET user_id = ?, group_id = ? WHERE rowid = ?").run(data.studentId, data.groupId, body.id); }
    if (resource === "teaching-assignments") { const data = assignmentSchema.parse(body); if (!sameUniversity(database, [{ table: "users", id: data.professorId }, { table: "courses", id: data.courseId }, { table: "groups", id: data.groupId }]) || database.prepare("SELECT role FROM users WHERE id = ?").get(data.professorId)?.role !== "professor") throw new Error("Invalid teaching relationship"); database.prepare("UPDATE teaching_assignments SET professor_id = ?, course_id = ?, group_id = ? WHERE rowid = ?").run(data.professorId, data.courseId, data.groupId, body.id); }
    if (resource === "timetable") { const data = timetableSchema.parse(body); if (!sameUniversity(database, [{ table: "courses", id: data.courseId }, { table: "groups", id: data.groupId }, { table: "users", id: data.professorId }])) throw new Error("Invalid timetable relationship"); database.prepare("UPDATE timetable_entries SET university_id = ?, course_id = ?, group_id = ?, professor_id = ?, weekday = ?, starts_at = ?, ends_at = ?, room = ? WHERE id = ?").run(data.universityId, data.courseId, data.groupId, data.professorId, data.weekday, data.startsAt, data.endsAt, data.room, body.id); }
    return NextResponse.json({ items: listRows(resource) });
  } catch (error) { return error instanceof z.ZodError ? NextResponse.json({ error: "Enter valid values for every required field." }, { status: 400 }) : errorResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const resource = validResource((await params).resource);
  if (!resource) return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
  if (isPeopleResource(resource) && id === session.userId) return NextResponse.json({ error: "You cannot delete the current admin account." }, { status: 409 });
  const table = resource === "subjects" ? "courses" : isPeopleResource(resource) ? "users" : resource;
  if (resource === "enrollments" || resource === "teaching-assignments") {
    const tableName = resource === "enrollments" ? "enrollments" : "teaching_assignments";
    try { getDatabase().prepare(`DELETE FROM ${tableName} WHERE rowid = ?`).run(id); return NextResponse.json({ items: listRows(resource) }); } catch (error) { return errorResponse(error); }
  }
  try { getDatabase().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id); return NextResponse.json({ items: listRows(resource) }); } catch (error) { return errorResponse(error); }
}