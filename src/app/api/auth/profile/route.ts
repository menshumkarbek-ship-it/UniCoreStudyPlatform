import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { profilePhoto?: unknown } | null;
  if (body?.profilePhoto !== null && typeof body?.profilePhoto !== "string") return NextResponse.json({ error: "Invalid profile photo." }, { status: 400 });
  if (typeof body?.profilePhoto === "string" && (!body.profilePhoto.startsWith("data:image/") || body.profilePhoto.length > 7_000_000)) return NextResponse.json({ error: "Use an image smaller than 5 MB." }, { status: 400 });
  getDatabase().prepare("UPDATE users SET profile_photo = ? WHERE id = ?").run(body?.profilePhoto ?? null, session.userId);
  return NextResponse.json({ profilePhoto: body?.profilePhoto ?? null });
}
