import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseId, readJson, requireUser, route } from "@/lib/http";
import { requireCourseAccess } from "@/lib/teaching";

export const runtime = "nodejs";

type Context = RouteContext<"/api/courses/[id]/plan">;

// The subject's syllabus and its lessons by week, each with its materials.
export const GET = route(async (_request, { params }: Context) => {
  const user = await requireUser("professor", "student");
  const courseId = parseId((await params).id);
  const { canEdit } = await requireCourseAccess(courseId, user);
  const course = await db.one<{ syllabus: string }>("SELECT syllabus FROM courses WHERE id = $1", [courseId]);
  const lessons = await db.many(
    `SELECT l.id, l.week, l.topic,
            COALESCE(json_agg(json_build_object('id', m.id, 'title', m.title, 'url', m.url, 'fileName', m.file_name, 'fileType', m.file_type, 'fileSize', m.file_size) ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL), '[]') AS materials
       FROM course_lessons l LEFT JOIN lesson_materials m ON m.lesson_id = l.id
      WHERE l.course_id = $1 GROUP BY l.id ORDER BY l.week, l.position, l.id`,
    [courseId],
  );
  return NextResponse.json({ canEdit, syllabus: course!.syllabus, lessons });
});

const syllabusSchema = z.object({ syllabus: z.string().trim().max(20000) });

export const PUT = route(async (request, { params }: Context) => {
  const user = await requireUser("professor");
  const courseId = parseId((await params).id);
  await requireCourseAccess(courseId, user, true);
  const { syllabus } = await readJson(request, syllabusSchema);
  await db.run("UPDATE courses SET syllabus = $2 WHERE id = $1", [courseId, syllabus]);
  return NextResponse.json({ ok: true });
});
