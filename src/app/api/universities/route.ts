import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const universities = getDatabase().prepare("SELECT id, name, city FROM universities ORDER BY name").all();
  return NextResponse.json({ universities });
}
