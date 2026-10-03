import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { idSchema, readJson, requireUser, route } from "@/lib/http";
import { autoSchedule, lockTimetable } from "@/lib/scheduling";

export const runtime = "nodejs";

// Fills in classes for every subject/group pair that has none yet.
export const POST = route(async (request) => {
  await requireUser("admin");
  const { universityId } = await readJson(request, z.object({ universityId: idSchema }));
  return NextResponse.json(await transaction(async (tx) => {
    await lockTimetable(tx, universityId);
    return autoSchedule(tx, universityId, null);
  }));
});
