import "server-only";

import type { Db } from "@/lib/db";
import { bellSchedule } from "@/lib/time";

/** Serialises timetable changes within a university so two admins cannot book the same slot at the same moment. */
export async function lockTimetable(tx: Db, universityId: number) {
  await tx.run("SELECT pg_advisory_xact_lock(727274002, $1::int)", [universityId]);
}

const roomPool = Array.from({ length: 12 }, (_, index) => `Room ${101 + index}`);
const teachingDays = [1, 2, 3, 4, 5];

type Busy = { weekday: number; startsAt: string; endsAt: string; groupId: number; professorId: number; room: string };

const overlaps = (a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) => a.startsAt < b.endsAt && a.endsAt > b.startsAt;

/**
 * Gives every (subject, group) pair that has no class yet one weekly class: the first free period
 * on the group's least busy weekday, with no clash for the group, the professor, or the room.
 * Existing classes are never moved. `courseId` limits it to one subject and `groupIds` to specific groups
 * (the groups just added to a subject, so a class an admin removed on purpose is not brought back). Returns how many classes
 * were created and how many pairs found no free slot (the admin can place those by hand).
 */
export async function autoSchedule(tx: Db, universityId: number, courseId: number | null, groupIds: number[] | null = null) {
  const pairs = await tx.many<{ courseId: number; groupId: number; professorId: number }>(
    `SELECT cg.course_id AS "courseId", cg.group_id AS "groupId", c.professor_id AS "professorId"
       FROM course_groups cg JOIN courses c ON c.id = cg.course_id
      WHERE cg.university_id = $1 AND ($2::bigint IS NULL OR cg.course_id = $2) AND ($3::bigint[] IS NULL OR cg.group_id = ANY($3::bigint[]))
        AND NOT EXISTS (SELECT 1 FROM timetable_entries te WHERE te.course_id = cg.course_id AND te.group_id = cg.group_id)
      ORDER BY cg.course_id, cg.group_id`,
    [universityId, courseId, groupIds],
  );
  if (pairs.length === 0) return { created: 0, unplaced: 0 };

  const busy = await tx.many<Busy>(
    `SELECT te.weekday, te.starts_at AS "startsAt", te.ends_at AS "endsAt", te.group_id AS "groupId", c.professor_id AS "professorId", lower(te.room) AS room
       FROM timetable_entries te JOIN courses c ON c.id = te.course_id WHERE c.university_id = $1`,
    [universityId],
  );

  let created = 0;
  for (const pair of pairs) {
    const candidates = teachingDays
      .flatMap((weekday) => bellSchedule.map((period, index) => ({ weekday, period, index, load: busy.filter((entry) => entry.groupId === pair.groupId && entry.weekday === weekday).length })))
      .sort((a, b) => a.load - b.load || a.weekday - b.weekday || a.index - b.index);
    for (const { weekday, period } of candidates) {
      const sameTime = busy.filter((entry) => entry.weekday === weekday && overlaps(entry, period));
      if (sameTime.some((entry) => entry.groupId === pair.groupId || entry.professorId === pair.professorId)) continue;
      const room = roomPool.find((name) => !sameTime.some((entry) => entry.room === name.toLowerCase()));
      if (!room) continue;
      await tx.run("INSERT INTO timetable_entries (course_id, group_id, weekday, starts_at, ends_at, room) VALUES ($1, $2, $3, $4, $5, $6)", [pair.courseId, pair.groupId, weekday, period.startsAt, period.endsAt, room]);
      busy.push({ weekday, ...period, groupId: pair.groupId, professorId: pair.professorId, room: room.toLowerCase() });
      created += 1;
      break;
    }
  }
  return { created, unplaced: pairs.length - created };
}
