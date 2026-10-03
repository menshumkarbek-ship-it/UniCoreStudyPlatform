import { NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction, type Db } from "@/lib/db";
import { gradingScheme } from "@/lib/grading";
import { HttpError, idSchema, parseId, readJson, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";

/** The scheme with how much homework and how many exams count toward each component. */
async function schemeWithUsage(universityId: number, tx: Db = db) {
  const [components, usage] = await Promise.all([
    gradingScheme(universityId, tx),
    tx.many<{ componentId: number; count: number }>(
      `SELECT component_id AS "componentId", COUNT(*) AS count FROM (
         SELECT h.component_id FROM homework h JOIN grading_components gc ON gc.id = h.component_id WHERE gc.university_id = $1
         UNION ALL SELECT x.component_id FROM exams x JOIN grading_components gc ON gc.id = x.component_id WHERE gc.university_id = $1
       ) used GROUP BY component_id`,
      [universityId],
    ),
  ]);
  return components.map((component) => ({ ...component, usage: usage.find((row) => row.componentId === component.id)?.count ?? 0 }));
}

export const GET = route(async (request) => {
  await requireUser("admin");
  const universityId = parseId(new URL(request.url).searchParams.get("universityId"));
  return NextResponse.json({ components: await schemeWithUsage(universityId) });
});

const schemeSchema = z.object({
  universityId: idSchema,
  components: z.array(z.object({
    id: idSchema.optional(),
    name: z.string().trim().min(1, "Give every component a name.").max(80),
    weight: z.coerce.number().min(0, "Weights must be between 0 and 100.").max(100, "Weights must be between 0 and 100."),
  })).min(1, "Keep at least one component.").max(20),
  // For a removed component that still has homework or exams: the kept component that work moves to.
  moves: z.array(z.object({ from: idSchema, to: idSchema })).max(20).default([]),
});

// Saves the whole scheme at once, so the weights can be checked to add up to 100%. Any component can be removed;
// one that still has work needs somewhere to move it, so no grade is lost.
export const PUT = route(async (request) => {
  await requireUser("admin");
  const { universityId, components, moves } = await readJson(request, schemeSchema);
  const total = components.reduce((sum, component) => sum + component.weight, 0);
  if (Math.abs(total - 100) > 0.001) throw new HttpError(400, `The weights add up to ${Math.round(total * 100) / 100}%. They must add up to 100%.`);
  const names = components.map((component) => component.name.toLowerCase());
  if (new Set(names).size !== names.length) throw new HttpError(400, "Each component needs a different name.");

  await transaction(async (tx) => {
    const existing = await schemeWithUsage(universityId, tx);
    if (!existing.length) throw new HttpError(404, "University not found.");
    const keptIds = new Set(components.flatMap((component) => component.id ? [component.id] : []));
    if ([...keptIds].some((id) => !existing.some((component) => component.id === id))) throw new HttpError(400, "A component no longer exists. Reload the page and try again.");
    const removed = existing.filter((component) => !keptIds.has(component.id));

    for (const component of removed) {
      const move = moves.find((item) => item.from === component.id);
      if (component.usage > 0) {
        if (!move || !keptIds.has(move.to)) throw new HttpError(400, `Choose where the homework and exams of “${component.name}” should move.`);
        await tx.run("UPDATE homework SET component_id = $2 WHERE component_id = $1", [component.id, move.to]);
        await tx.run("UPDATE exams SET component_id = $2 WHERE component_id = $1", [component.id, move.to]);
      }
      await tx.run("DELETE FROM grading_components WHERE id = $1", [component.id]);
    }

    // Names are unique per university, so park the kept ones on temporary names before renaming (e.g. swapping two names).
    await tx.run("UPDATE grading_components SET name = '~' || id WHERE university_id = $1", [universityId]);
    for (const [index, component] of components.entries()) {
      if (component.id) await tx.run("UPDATE grading_components SET name = $2, weight = $3, position = $4 WHERE id = $1", [component.id, component.name, component.weight, index + 1]);
      else await tx.run("INSERT INTO grading_components (university_id, name, weight, position) VALUES ($1, $2, $3, $4)", [universityId, component.name, component.weight, index + 1]);
    }

    // A removed default passes to the component its work moved to, or else to the first one left.
    for (const [flag, column] of [["defaultHomework", "default_homework"], ["defaultExams", "default_exams"]] as const) {
      const lost = removed.find((component) => component[flag]);
      if (!lost) continue;
      const heir = moves.find((item) => item.from === lost.id)?.to
        ?? (await tx.one<{ id: number }>("SELECT id FROM grading_components WHERE university_id = $1 ORDER BY position, id LIMIT 1", [universityId]))!.id;
      await tx.run(`UPDATE grading_components SET ${column} = true WHERE id = $1`, [heir]);
    }
  });
  return NextResponse.json({ components: await schemeWithUsage(universityId) });
});
