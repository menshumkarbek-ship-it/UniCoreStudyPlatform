import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { route } from "@/lib/http";

export const runtime = "nodejs";

/** The signed-in user, or `{ user: null }` when signed out (not an error: the sign-in page asks this). */
export const GET = route(async () => NextResponse.json({ user: await getSession() }));
