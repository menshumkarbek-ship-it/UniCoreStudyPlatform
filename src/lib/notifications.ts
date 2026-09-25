import type { DatabaseSync } from "node:sqlite";

export function notifyGroup(database: DatabaseSync, groupId: number, title: string, detail: string, href: string) {
  const recipients = database.prepare("SELECT e.user_id AS userId, g.university_id AS universityId FROM enrollments e JOIN groups g ON g.id = e.group_id JOIN users u ON u.id = e.user_id WHERE e.group_id = ? AND u.role = 'student'").all(groupId) as { userId: number; universityId: number }[];
  const insert = database.prepare("INSERT INTO notifications (university_id, recipient_id, title, detail, href) VALUES (?, ?, ?, ?, ?)");
  for (const recipient of recipients) insert.run(Number(recipient.universityId), Number(recipient.userId), title, detail, href);
}
