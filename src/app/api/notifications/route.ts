import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { idSchema, readJson, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  const [notifications, unread] = await Promise.all([
    db.many(`SELECT id, title, detail, href, read_at AS "readAt", created_at AS "createdAt" FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 30`, [user.id]),
    db.one<{ count: number }>("SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND read_at IS NULL", [user.id]),
  ]);
  return NextResponse.json({ notifications, unreadCount: unread?.count ?? 0 });
});

const markSchema = z.union([z.object({ all: z.literal(true) }), z.object({ id: idSchema })]);

export const PATCH = route(async (request) => {
  const user = await requireUser();
  const body = await readJson(request, markSchema);
  if ("all" in body) await db.run("UPDATE notifications SET read_at = now() WHERE recipient_id = $1 AND read_at IS NULL", [user.id]);
  else await db.run("UPDATE notifications SET read_at = now() WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL", [body.id, user.id]);
  return NextResponse.json({ ok: true });
});
