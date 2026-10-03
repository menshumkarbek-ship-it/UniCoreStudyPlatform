import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertBodyWithin, deleteUpload, imageKinds, saveUpload, validateUpload } from "@/lib/files";
import { readForm, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

export const PUT = route(async (request) => {
  const user = await requireUser();
  assertBodyWithin(request, 5 * 1024 * 1024);
  const upload = await validateUpload((await readForm(request)).get("photo"), imageKinds, 5 * 1024 * 1024, "JPG, PNG, or WebP");
  const photoPath = await saveUpload("photos", upload);
  const previous = await db.one<{ photoPath: string | null }>(`SELECT photo_path AS "photoPath" FROM users WHERE id = $1`, [user.id]);
  await db.run("UPDATE users SET photo_path = $2 WHERE id = $1", [user.id, photoPath]);
  await deleteUpload(previous?.photoPath);
  return NextResponse.json({ photoUrl: `/api/users/${user.id}/photo?v=${Date.now()}` });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  const previous = await db.one<{ photoPath: string | null }>(`SELECT photo_path AS "photoPath" FROM users WHERE id = $1`, [user.id]);
  await db.run("UPDATE users SET photo_path = NULL WHERE id = $1", [user.id]);
  await deleteUpload(previous?.photoPath);
  return NextResponse.json({ photoUrl: null });
});
