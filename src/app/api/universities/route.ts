import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const runtime = "nodejs";

/** Public list for the sign-in page's university picker. */
export const GET = route(async () => {
  const universities = await db.many("SELECT id, name, city FROM universities ORDER BY name");
  return NextResponse.json({ universities });
});
