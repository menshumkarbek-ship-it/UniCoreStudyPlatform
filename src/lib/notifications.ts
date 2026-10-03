import "server-only";

import type { Db } from "@/lib/db";

/** Notifies every student enrolled in the group, and the professor who posted it (`alsoUserId`) with the same message. */
export async function notifyGroup(tx: Db, groupId: number, title: string, detail: string, href: string, alsoUserId?: number) {
  if (alsoUserId) await notifyUser(tx, alsoUserId, title, detail, href);
  await tx.run(
    "INSERT INTO notifications (recipient_id, title, detail, href) SELECT e.student_id, $2, $3, $4 FROM enrollments e WHERE e.group_id = $1",
    [groupId, title, detail.slice(0, 500), href],
  );
}

export async function notifyUser(tx: Db, userId: number, title: string, detail: string, href: string) {
  await tx.run("INSERT INTO notifications (recipient_id, title, detail, href) VALUES ($1, $2, $3, $4)", [userId, title, detail.slice(0, 500), href]);
}

/**
 * Catches up a student who joins a group on what their classmates were already notified about: homework that is
 * still open and exams still to come. Same wording as the original notifications, dated when each was posted.
 */
export async function notifyJoinedGroup(tx: Db, studentId: number, groupId: number) {
  await tx.run(
    `INSERT INTO notifications (recipient_id, title, detail, href, created_at)
     SELECT $1::bigint, 'New homework: ' || h.title, c.code || ' · due ' || to_char(h.due_at AT TIME ZONE u.timezone, 'FMDD Mon'), '/homework', h.created_at
       FROM homework h JOIN courses c ON c.id = h.course_id JOIN universities u ON u.id = c.university_id
      WHERE h.group_id = $2 AND h.due_at > now()
     UNION ALL
     SELECT $1::bigint, 'New exam: ' || x.title, c.code || ' · ' || x.exam_date || ' · ' || to_char(x.starts_at, 'HH24:MI') || '–' || to_char(x.ends_at, 'HH24:MI'), '/exams', x.created_at
       FROM exams x JOIN courses c ON c.id = x.course_id JOIN universities u ON u.id = c.university_id
      WHERE x.group_id = $2 AND x.exam_date >= (now() AT TIME ZONE u.timezone)::date`,
    [studentId, groupId],
  );
}
