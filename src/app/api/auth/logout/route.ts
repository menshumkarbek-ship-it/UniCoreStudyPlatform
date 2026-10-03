import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";
import { route } from "@/lib/http";

export const runtime = "nodejs";

export const POST = route(async () => {
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
});
