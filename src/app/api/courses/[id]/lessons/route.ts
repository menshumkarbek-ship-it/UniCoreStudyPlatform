import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseId, readJson, requireUser, route } from "@/lib/http";
import { requireCourseAccess } from "@/lib/teaching";

export const runtime = "nodejs";

const lessonSchema = z.object({ week: z.coerce.number().int().min(1).max(60), topic: z.string().trim().min(1).max(300) });

// Adds a lesson at the end of its week.
export const POST = route(async (request, { params }: RouteContext<"/api/courses/[id]/lessons">) => {
  const user = await requireUser("professor");
  const courseId = parseId((await params).id);
  await requireCourseAccess(courseId, user, true);
  const { week, topic } = await readJson(request, lessonSchema);
  const created = await db.one<{ id: number }>(
    `INSERT INTO course_lessons (course_id, week, topic, position)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) + 1 FROM course_lessons WHERE course_id = $1 AND week = $2), 0)) RETURNING id`,
    [courseId, week, topic],
  );
  return NextResponse.json({ id: created!.id }, { status: 201 });
});
