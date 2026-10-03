import { db } from "@/lib/db";
import { fileResponse } from "@/lib/files";
import { HttpError, parseId, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

// Profile photos are visible to people at the same university and to platform admins.
export const GET = route(async (_request, { params }: RouteContext<"/api/users/[id]/photo">) => {
  const viewer = await requireUser();
  const userId = parseId((await params).id);
  const target = await db.one<{ photoPath: string | null; universityId: number | null }>(`SELECT photo_path AS "photoPath", university_id AS "universityId" FROM users WHERE id = $1`, [userId]);
  const allowed = target && (viewer.role === "admin" || viewer.id === userId || viewer.universityId === target.universityId);
  if (!allowed || !target.photoPath) throw new HttpError(404, "Photo not found.");
  const extension = target.photoPath.split(".").pop();
  return fileResponse(target.photoPath, `photo.${extension}`, extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg", false);
});
