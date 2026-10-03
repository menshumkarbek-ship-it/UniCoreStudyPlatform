import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "@/lib/db";
import { idSchema, readJson, requireUser, route } from "@/lib/http";
import { notifyGroup } from "@/lib/notifications";
import { professorOfferings, requireOwnedOffering } from "@/lib/teaching";

export const runtime = "nodejs";

const announcementSchema = z.object({
  courseId: idSchema,
  groupId: idSchema,
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(5000),
});

const announcementColumns = `a.id, a.title, a.body, a.created_at AS "createdAt", c.code AS "courseCode", c.title AS "courseTitle", g.name AS "groupName", p.full_name AS "professorName"`;
const announcementJoins = "FROM announcements a JOIN courses c ON c.id = a.course_id JOIN groups g ON g.id = a.group_id JOIN users p ON p.id = a.created_by";

export const GET = route(async () => {
  const user = await requireUser("professor", "student");
  if (user.role === "professor") {
    const [announcements, offerings] = await Promise.all([
      db.many(`SELECT ${announcementColumns} ${announcementJoins} WHERE c.professor_id = $1 ORDER BY a.created_at DESC LIMIT 100`, [user.id]),
      professorOfferings(user.id),
    ]);
    return NextResponse.json({ announcements, offerings });
  }
  const announcements = await db.many(
    `SELECT ${announcementColumns} ${announcementJoins} WHERE a.group_id = (SELECT group_id FROM enrollments WHERE student_id = $1) ORDER BY a.created_at DESC LIMIT 100`,
    [user.id],
  );
  return NextResponse.json({ announcements });
});

export const POST = route(async (request) => {
  const user = await requireUser("professor");
  const data = await readJson(request, announcementSchema);
  const id = await transaction(async (tx) => {
    const offering = await requireOwnedOffering(user.id, data.courseId, data.groupId, tx);
    const created = await tx.one<{ id: number }>("INSERT INTO announcements (course_id, group_id, created_by, title, body) VALUES ($1, $2, $3, $4, $5) RETURNING id", [data.courseId, data.groupId, user.id, data.title, data.body]);
    await notifyGroup(tx, data.groupId, `${offering.courseCode}: ${data.title}`, data.body, "/bulletin", user.id);
    return created!.id;
  });
  return NextResponse.json({ id }, { status: 201 });
});
