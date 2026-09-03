import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const university = getDatabase().prepare("SELECT id, name, city FROM universities WHERE id = ?").get(session.universityId);
  return NextResponse.json({ user: session, university });
}
