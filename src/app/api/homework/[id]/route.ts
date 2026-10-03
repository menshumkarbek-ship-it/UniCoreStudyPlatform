import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/files";
import { parseId, requireUser, route } from "@/lib/http";
import { loadHomework } from "@/lib/teaching";

export const runtime = "nodejs";

export const DELETE = route(async (_request, { params }: RouteContext<"/api/homework/[id]">) => {
  const user = await requireUser("professor");
  const homework = await loadHomework(parseId((await params).id), user);
  const files = await db.many<{ filePath: string }>(`SELECT file_path AS "filePath" FROM homework_submissions WHERE homework_id = $1`, [homework.id]);
  await db.run("DELETE FROM homework WHERE id = $1", [homework.id]);
  await Promise.all(files.map((file) => deleteUpload(file.filePath)));
  return NextResponse.json({ ok: true });
});
