# UniCore data architecture

## Database

PostgreSQL, accessed through `src/lib/db.ts` (a `pg` connection pool with `db.one`, `db.many`, `db.run`, and `transaction`). Schema changes are SQL files in `db/migrations`, applied in order by `npm run db:migrate`, which records each file in `schema_migrations`. Never edit an applied migration; add a new file.

There is no seed data. The first platform administrator is created with `npm run admin:create`.

## Ownership and tenancy

- `universities` is the tenant. Everything below belongs to exactly one university.
- `users` has a role: `admin` (platform administrator, `university_id` is NULL), `professor`, or `student` (both must have a `university_id`).
- `faculties` belong to a university; `groups` belong to a faculty.
- `enrollments` puts each student in exactly one group.
- `courses` (shown as "Subjects") belong to a university, optionally a faculty, and **exactly one professor**.
- `course_groups` says which groups take a course. This (course, group) pair is called an *offering*.
- `timetable_entries`, `homework`, `exams`, `attendance_sessions`, and `announcements` all reference an offering.

Cross-university links are impossible at the database level: university-owned tables carry `university_id`, and relationships use composite foreign keys such as `(group_id, university_id) → groups(id, university_id)`.

A professor's timetable is every timetable entry of the courses they own. A student's timetable is every entry for their group. Reassigning a course to another professor moves its timetable, homework, and gradebook with it.

## Rules the application enforces

1. A professor can act only on offerings of courses they own (`requireOwnedOffering` in `src/lib/teaching.ts`).
2. A student can see and submit only work for their own group.
3. Timetable entries may not overlap for the same group, the same professor, or the same room.
4. Weekdays are ISO numbers everywhere: 1 = Monday … 7 = Sunday (`src/lib/time.ts`).
5. "Now" for attendance and exam dates is computed in the university's `timezone`, not the server's.
6. Deletes are restrictive: you cannot delete a university, faculty, group, or professor that other records still depend on, and you cannot unlink a group from a course once it has homework, exams, or attendance.
7. Passwords are bcrypt hashes. Sessions are signed cookies whose `token_version` must match the user row, so changing a password (or an admin resetting it) signs out every other device.
8. Uploaded files are checked by content (PDF/JPEG/PNG/WebP signatures), stored under random names in `UPLOAD_DIR`, and served only through authorised routes.
9. Failed logins and wrong attendance codes are throttled through `rate_limit_events`.
