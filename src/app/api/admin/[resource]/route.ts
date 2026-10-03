import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { db, transaction, type Db } from "@/lib/db";
import { deleteUpload } from "@/lib/files";
import { createDefaultScheme } from "@/lib/grading";
import { notifyJoinedGroup } from "@/lib/notifications";
import { autoSchedule, lockTimetable } from "@/lib/scheduling";
import { HttpError, idSchema, parseId, readJson, requireUser, route, timeSchema } from "@/lib/http";

export const runtime = "nodejs";

type Context = RouteContext<"/api/admin/[resource]">;
const resources = ["universities", "faculties", "groups", "professors", "students", "courses", "timetable"] as const;
type Resource = (typeof resources)[number];

function resourceFrom(value: string): Resource {
  if (!(resources as readonly string[]).includes(value)) throw new HttpError(404, "Unknown admin resource.");
  return value as Resource;
}

const text = (max: number) => z.string().trim().min(1, "Fill in every required field.").max(max);
const optionalPassword = z.string().max(200).optional().transform((value) => value || undefined).refine((value) => !value || value.length >= 8, "Passwords must be at least 8 characters.");

const schemas = {
  universities: z.object({
    name: text(200),
    city: text(120),
    timezone: z.string().trim().default("Asia/Bishkek").refine((zone) => { try { new Intl.DateTimeFormat("en", { timeZone: zone }); return true; } catch { return false; } }, "Unknown time zone."),
  }),
  faculties: z.object({
    universityId: idSchema,
    name: text(160),
    // Typed by the admin; duplicates (ignoring case) are dropped, keeping the first spelling.
    degrees: z.array(z.string().trim().max(60)).max(20).default([])
      .transform((degrees) => degrees.filter((degree, index) => degree && degrees.findIndex((other) => other.toLowerCase() === degree.toLowerCase()) === index)),
  }),
  groups: z.object({
    universityId: idSchema,
    facultyId: idSchema,
    name: text(120),
    degree: z.string().trim().max(60).optional().transform((value) => value || null),
    studyYear: z.string().trim().min(1, "Enter the group's year of study.").max(40),
  }),
  professors: z.object({ universityId: idSchema, fullName: text(160), email: z.string().trim().toLowerCase().email().max(160), password: optionalPassword }),
  students: z.object({ universityId: idSchema, fullName: text(160), email: z.string().trim().toLowerCase().email().max(160), studentNumber: z.string().trim().max(60).optional().transform((value) => value || null), groupId: idSchema, password: optionalPassword }),
  courses: z.object({ universityId: idSchema, facultyId: idSchema.nullable().optional().transform((value) => value ?? null), professorId: idSchema, code: text(40).transform((value) => value.toUpperCase()), title: text(200), groupIds: z.array(idSchema).max(200).default([]) }),
  timetable: z.object({ universityId: idSchema, courseId: idSchema, groupId: idSchema, weekday: z.coerce.number().int().min(1).max(7), startsAt: timeSchema, endsAt: timeSchema, room: text(80) }).refine((entry) => entry.endsAt > entry.startsAt, "The class must end after it starts."),
} satisfies Record<Resource, z.ZodType>;

async function list(resource: Resource, universityId: number | null) {
  if (resource === "universities") {
    return db.many(
      `SELECT u.id, u.name, u.city, u.timezone, u.created_at AS "createdAt",
              (SELECT COUNT(*) FROM faculties f WHERE f.university_id = u.id) AS "facultyCount",
              (SELECT COUNT(*) FROM groups g WHERE g.university_id = u.id) AS "groupCount",
              (SELECT COUNT(*) FROM users p WHERE p.university_id = u.id AND p.role = 'professor') AS "professorCount",
              (SELECT COUNT(*) FROM users s WHERE s.university_id = u.id AND s.role = 'student') AS "studentCount",
              (SELECT COUNT(*) FROM courses c WHERE c.university_id = u.id) AS "courseCount"
         FROM universities u ORDER BY u.name`,
    );
  }
  if (!universityId) throw new HttpError(400, "Choose a university first.");
  const queries: Record<Exclude<Resource, "universities">, string> = {
    faculties: `SELECT f.id, f.name, f.degrees, (SELECT COUNT(*) FROM groups g WHERE g.faculty_id = f.id) AS "groupCount", (SELECT COUNT(*) FROM courses c WHERE c.faculty_id = f.id) AS "courseCount"
                  FROM faculties f WHERE f.university_id = $1 ORDER BY f.name`,
    groups: `SELECT g.id, g.name, g.faculty_id AS "facultyId", f.name AS "facultyName", g.degree, g.study_year AS "studyYear",
                    (SELECT COUNT(*) FROM enrollments e WHERE e.group_id = g.id) AS "studentCount", (SELECT COUNT(*) FROM course_groups cg WHERE cg.group_id = g.id) AS "courseCount"
               FROM groups g JOIN faculties f ON f.id = g.faculty_id WHERE g.university_id = $1 ORDER BY f.name, g.name`,
    professors: `SELECT u.id, u.full_name AS "fullName", u.email, (SELECT COUNT(*) FROM courses c WHERE c.professor_id = u.id) AS "courseCount"
                   FROM users u WHERE u.university_id = $1 AND u.role = 'professor' ORDER BY u.full_name`,
    students: `SELECT u.id, u.full_name AS "fullName", u.email, u.student_number AS "studentNumber", g.id AS "groupId", g.name AS "groupName", f.name AS "facultyName"
                 FROM users u LEFT JOIN enrollments e ON e.student_id = u.id LEFT JOIN groups g ON g.id = e.group_id LEFT JOIN faculties f ON f.id = g.faculty_id
                WHERE u.university_id = $1 AND u.role = 'student' ORDER BY g.name NULLS FIRST, u.full_name`,
    courses: `SELECT c.id, c.code, c.title, c.faculty_id AS "facultyId", f.name AS "facultyName", c.professor_id AS "professorId", p.full_name AS "professorName",
                     COALESCE(json_agg(json_build_object('id', g.id, 'name', g.name) ORDER BY g.name) FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
                FROM courses c JOIN users p ON p.id = c.professor_id LEFT JOIN faculties f ON f.id = c.faculty_id
                LEFT JOIN course_groups cg ON cg.course_id = c.id LEFT JOIN groups g ON g.id = cg.group_id
               WHERE c.university_id = $1 GROUP BY c.id, f.name, p.full_name ORDER BY c.code`,
    timetable: `SELECT te.id, te.weekday, te.starts_at AS "startsAt", te.ends_at AS "endsAt", te.room, c.id AS "courseId", c.code, c.title,
                       g.id AS "groupId", g.name AS "groupName", p.id AS "professorId", p.full_name AS "professorName"
                  FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id JOIN users p ON p.id = c.professor_id
                 WHERE c.university_id = $1 ORDER BY te.weekday, te.starts_at, g.name`,
  };
  return db.many(queries[resource], [universityId]);
}

async function requireProfessor(tx: Db, professorId: number, universityId: number) {
  const professor = await tx.one("SELECT 1 FROM users WHERE id = $1 AND university_id = $2 AND role = 'professor'", [professorId, universityId]);
  if (!professor) throw new HttpError(400, "Choose a professor from this university.");
}

/** Rejects a class that overlaps another class of the same group, professor, or room. */
async function assertNoTimetableClash(tx: Db, entry: z.infer<typeof schemas.timetable>, ignoreId: number | null) {
  const clash = await tx.one<{ code: string; groupName: string; professorName: string; room: string; startsAt: string; endsAt: string; reason: string }>(
    `SELECT c.code, g.name AS "groupName", p.full_name AS "professorName", te.room, te.starts_at AS "startsAt", te.ends_at AS "endsAt",
            CASE WHEN te.group_id = $5 THEN 'group' WHEN c.professor_id = (SELECT professor_id FROM courses WHERE id = $6) THEN 'professor' ELSE 'room' END AS reason
       FROM timetable_entries te JOIN courses c ON c.id = te.course_id JOIN groups g ON g.id = te.group_id JOIN users p ON p.id = c.professor_id
      WHERE c.university_id = $1 AND te.weekday = $2 AND te.starts_at < $4 AND te.ends_at > $3 AND te.id <> COALESCE($8, 0)
        AND (te.group_id = $5 OR c.professor_id = (SELECT professor_id FROM courses WHERE id = $6) OR lower(te.room) = lower($7))
      LIMIT 1`,
    [entry.universityId, entry.weekday, entry.startsAt, entry.endsAt, entry.groupId, entry.courseId, entry.room, ignoreId],
  );
  if (!clash) return;
  const who = clash.reason === "group" ? `Group ${clash.groupName}` : clash.reason === "professor" ? clash.professorName : `Room ${clash.room}`;
  throw new HttpError(409, `${who} already has ${clash.code} (${clash.groupName}) from ${clash.startsAt} to ${clash.endsAt}.`);
}

/** Re-checks every class of a subject, e.g. after its professor changed, so nobody ends up in two places at once. */
async function assertCourseSchedulesFit(tx: Db, courseId: number, universityId: number) {
  const entries = await tx.many<{ id: number; groupId: number; weekday: number; startsAt: string; endsAt: string; room: string }>(
    `SELECT id, group_id AS "groupId", weekday, starts_at AS "startsAt", ends_at AS "endsAt", room FROM timetable_entries WHERE course_id = $1`,
    [courseId],
  );
  for (const entry of entries) await assertNoTimetableClash(tx, { universityId, courseId, groupId: entry.groupId, weekday: entry.weekday, startsAt: entry.startsAt, endsAt: entry.endsAt, room: entry.room }, entry.id);
}

async function assertOffered(tx: Db, courseId: number, groupId: number, universityId: number) {
  const offered = await tx.one("SELECT 1 FROM course_groups WHERE course_id = $1 AND group_id = $2 AND university_id = $3", [courseId, groupId, universityId]);
  if (!offered) throw new HttpError(400, "That group does not take this subject. Add the group to the subject first.");
}

async function save(tx: Db, resource: Resource, body: unknown, id: number | null) {
  switch (resource) {
    case "universities": {
      const data = schemas.universities.parse(body);
      if (id) await tx.run("UPDATE universities SET name = $2, city = $3, timezone = $4 WHERE id = $1", [id, data.name, data.city, data.timezone]);
      else {
        const created = await tx.one<{ id: number }>("INSERT INTO universities (name, city, timezone) VALUES ($1, $2, $3) RETURNING id", [data.name, data.city, data.timezone]);
        // Every university starts with the default grading scheme; its admin can change it on the Grading tab.
        await createDefaultScheme(tx, created!.id);
      }
      return null;
    }
    case "faculties": {
      const data = schemas.faculties.parse(body);
      if (id) {
        // A degree can't be dropped while a group still follows it.
        const orphaned = await tx.one<{ name: string; degree: string }>(
          "SELECT name, degree FROM groups WHERE faculty_id = $1 AND university_id = $2 AND degree IS NOT NULL AND NOT (degree = ANY($3::text[])) ORDER BY name LIMIT 1",
          [id, data.universityId, data.degrees],
        );
        if (orphaned) throw new HttpError(409, `Group ${orphaned.name} is a ${orphaned.degree} group, so ${orphaned.degree} can't be removed. Change the group's degree first.`);
        await tx.run("UPDATE faculties SET name = $3, degrees = $4 WHERE id = $1 AND university_id = $2", [id, data.universityId, data.name, data.degrees]);
      } else await tx.run("INSERT INTO faculties (university_id, name, degrees) VALUES ($1, $2, $3)", [data.universityId, data.name, data.degrees]);
      return data.universityId;
    }
    case "groups": {
      const data = schemas.groups.parse(body);
      // The degree must be one the group's faculty offers; a faculty with no degrees listed yet takes none.
      const faculty = await tx.one<{ degrees: string[] }>("SELECT degrees FROM faculties WHERE id = $1 AND university_id = $2", [data.facultyId, data.universityId]);
      if (!faculty) throw new HttpError(400, "Choose a faculty from this university.");
      if (faculty.degrees.length && !data.degree) throw new HttpError(400, "Choose the group's degree.");
      if (data.degree && !faculty.degrees.includes(data.degree)) throw new HttpError(400, "Choose one of the degrees this faculty offers.");
      if (id) await tx.run("UPDATE groups SET faculty_id = $3, name = $4, degree = $5, study_year = $6 WHERE id = $1 AND university_id = $2", [id, data.universityId, data.facultyId, data.name, data.degree, data.studyYear]);
      else await tx.run("INSERT INTO groups (university_id, faculty_id, name, degree, study_year) VALUES ($1, $2, $3, $4, $5)", [data.universityId, data.facultyId, data.name, data.degree, data.studyYear]);
      return data.universityId;
    }
    case "professors":
    case "students": {
      const role = resource === "professors" ? "professor" : "student";
      const data = resource === "professors" ? { ...schemas.professors.parse(body), studentNumber: null, groupId: null } : schemas.students.parse(body);
      if (!id && !data.password) throw new HttpError(400, "Set an initial password (at least 8 characters).");
      const passwordHash = data.password ? await hashPassword(data.password) : null;
      let userId = id;
      if (id) {
        const updated = await tx.run(
          `UPDATE users SET full_name = $4, email = $5, student_number = $6,
                  password_hash = COALESCE($7, password_hash), token_version = token_version + CASE WHEN $7::text IS NULL THEN 0 ELSE 1 END
            WHERE id = $1 AND university_id = $2 AND role = $3`,
          [id, data.universityId, role, data.fullName, data.email, data.studentNumber, passwordHash],
        );
        if (!updated) throw new HttpError(404, "Record not found.");
      } else {
        userId = (await tx.one<{ id: number }>(
          "INSERT INTO users (university_id, role, email, full_name, password_hash, student_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [data.universityId, role, data.email, data.fullName, passwordHash, data.studentNumber],
        ))!.id;
      }
      if (data.groupId) {
        const previous = await tx.one<{ groupId: number }>(`SELECT group_id AS "groupId" FROM enrollments WHERE student_id = $1`, [userId]);
        await tx.run(
          "INSERT INTO enrollments (student_id, group_id, university_id) VALUES ($1, $2, $3) ON CONFLICT (student_id) DO UPDATE SET group_id = EXCLUDED.group_id",
          [userId, data.groupId, data.universityId],
        );
        if (previous?.groupId !== data.groupId) await notifyJoinedGroup(tx, userId!, data.groupId);
      }
      return data.universityId;
    }
    case "courses": {
      const data = schemas.courses.parse(body);
      await lockTimetable(tx, data.universityId);
      await requireProfessor(tx, data.professorId, data.universityId);
      let courseId = id;
      let professorChanged = false;
      if (id) {
        professorChanged = (await tx.one<{ professorId: number }>(`SELECT professor_id AS "professorId" FROM courses WHERE id = $1 AND university_id = $2`, [id, data.universityId]))?.professorId !== data.professorId;
        const updated = await tx.run("UPDATE courses SET faculty_id = $3, professor_id = $4, code = $5, title = $6 WHERE id = $1 AND university_id = $2", [id, data.universityId, data.facultyId, data.professorId, data.code, data.title]);
        if (!updated) throw new HttpError(404, "Record not found.");
        const removedGroups = await tx.many<{ name: string }>(
          "SELECT g.name FROM course_groups cg JOIN groups g ON g.id = cg.group_id WHERE cg.course_id = $1 AND NOT (cg.group_id = ANY($2::bigint[]))",
          [id, data.groupIds],
        );
        if (removedGroups.length) {
          const inUse = await tx.one<{ name: string }>(
            `SELECT g.name FROM course_groups cg JOIN groups g ON g.id = cg.group_id
              WHERE cg.course_id = $1 AND NOT (cg.group_id = ANY($2::bigint[]))
                AND (EXISTS (SELECT 1 FROM homework h WHERE h.course_id = cg.course_id AND h.group_id = cg.group_id)
                  OR EXISTS (SELECT 1 FROM exams x WHERE x.course_id = cg.course_id AND x.group_id = cg.group_id)
                  OR EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.course_id = cg.course_id AND s.group_id = cg.group_id))
              LIMIT 1`,
            [id, data.groupIds],
          );
          if (inUse) throw new HttpError(409, `Group ${inUse.name} already has homework, exams, or attendance for this subject, so it cannot be removed.`);
          await tx.run("DELETE FROM course_groups WHERE course_id = $1 AND NOT (group_id = ANY($2::bigint[]))", [id, data.groupIds]);
        }
      } else {
        courseId = (await tx.one<{ id: number }>(
          "INSERT INTO courses (university_id, faculty_id, professor_id, code, title) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [data.universityId, data.facultyId, data.professorId, data.code, data.title],
        ))!.id;
      }
      const addedGroupIds: number[] = [];
      for (const groupId of data.groupIds) {
        if (await tx.run("INSERT INTO course_groups (course_id, group_id, university_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [courseId, groupId, data.universityId]) > 0) addedGroupIds.push(groupId);
      }
      // A new professor must be free at every time this subject already meets.
      if (id && professorChanged) await assertCourseSchedulesFit(tx, id, data.universityId);
      // Only newly added (subject, group) pairs get a weekly class automatically; the admin can edit or move it afterwards.
      if (addedGroupIds.length) await autoSchedule(tx, data.universityId, courseId, addedGroupIds);
      return data.universityId;
    }
    case "timetable": {
      const data = schemas.timetable.parse(body);
      await lockTimetable(tx, data.universityId);
      await assertOffered(tx, data.courseId, data.groupId, data.universityId);
      await assertNoTimetableClash(tx, data, id);
      if (id) {
        const updated = await tx.run(
          "UPDATE timetable_entries te SET course_id = $2, group_id = $3, weekday = $4, starts_at = $5, ends_at = $6, room = $7 FROM courses c WHERE te.id = $1 AND c.id = te.course_id AND c.university_id = $8",
          [id, data.courseId, data.groupId, data.weekday, data.startsAt, data.endsAt, data.room, data.universityId],
        );
        if (!updated) throw new HttpError(404, "Record not found.");
      } else {
        await tx.run("INSERT INTO timetable_entries (course_id, group_id, weekday, starts_at, ends_at, room) VALUES ($1, $2, $3, $4, $5, $6)", [data.courseId, data.groupId, data.weekday, data.startsAt, data.endsAt, data.room]);
      }
      return data.universityId;
    }
  }
}

export const GET = route(async (request, { params }: Context) => {
  await requireUser("admin");
  const resource = resourceFrom((await params).resource);
  const universityParam = new URL(request.url).searchParams.get("universityId");
  return NextResponse.json({ items: await list(resource, universityParam ? parseId(universityParam) : null) });
});

export const POST = route(async (request, { params }: Context) => {
  await requireUser("admin");
  const resource = resourceFrom((await params).resource);
  const body = await readJson(request, z.record(z.string(), z.unknown()));
  const universityId = await transaction((tx) => save(tx, resource, body, null));
  return NextResponse.json({ items: await list(resource, universityId) }, { status: 201 });
});

export const PATCH = route(async (request, { params }: Context) => {
  await requireUser("admin");
  const resource = resourceFrom((await params).resource);
  const body = await readJson(request, z.record(z.string(), z.unknown()));
  const id = parseId(String(body.id ?? ""));
  const universityId = await transaction((tx) => save(tx, resource, body, id));
  return NextResponse.json({ items: await list(resource, universityId) });
});

const deleteQueries: Record<Resource, string> = {
  universities: "DELETE FROM universities WHERE id = $1",
  faculties: "DELETE FROM faculties WHERE id = $1 AND university_id = $2",
  groups: "DELETE FROM groups WHERE id = $1 AND university_id = $2",
  professors: "DELETE FROM users WHERE id = $1 AND university_id = $2 AND role = 'professor'",
  students: "DELETE FROM users WHERE id = $1 AND university_id = $2 AND role = 'student'",
  courses: "DELETE FROM courses WHERE id = $1 AND university_id = $2",
  timetable: "DELETE FROM timetable_entries te USING courses c WHERE te.id = $1 AND c.id = te.course_id AND c.university_id = $2",
};

export const DELETE = route(async (request, { params }: Context) => {
  await requireUser("admin");
  const resource = resourceFrom((await params).resource);
  const searchParams = new URL(request.url).searchParams;
  const id = parseId(searchParams.get("id"));
  const universityId = resource === "universities" ? null : parseId(searchParams.get("universityId"));
  // A deleted student's uploads are removed from disk along with their rows.
  const files = resource === "students" || resource === "professors"
    ? await db.many<{ path: string }>(`SELECT file_path AS path FROM homework_submissions WHERE student_id = $1 UNION ALL SELECT photo_path FROM users WHERE id = $1 AND photo_path IS NOT NULL`, [id])
    : [];
  const deleted = await db.run(deleteQueries[resource], resource === "universities" ? [id] : [id, universityId]);
  if (!deleted) throw new HttpError(404, "Record not found.");
  await Promise.all(files.map((file) => deleteUpload(file.path)));
  return NextResponse.json({ items: await list(resource, universityId) });
});
