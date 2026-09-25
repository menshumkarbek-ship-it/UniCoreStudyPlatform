import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const notifications = getDatabase().prepare("SELECT id, title, detail, href, read_at AS readAt, created_at AS createdAt FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 20").all(session.userId);
  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: number; all?: boolean } | null;
  const database = getDatabase();
  if (body?.all) database.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = ? AND read_at IS NULL").run(session.userId);
  else if (body?.id) database.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ?").run(body.id, session.userId);
  else return NextResponse.json({ error: "A notification ID is required." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
