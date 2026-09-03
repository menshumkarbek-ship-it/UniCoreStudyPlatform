# TronSabak data architecture

## Database decision

SQLite is the local skeleton database. It is simple, file-based, and useful while the product and CRUD workflows are changing quickly.

PostgreSQL is the production database for the republic-wide platform. It is the right target for concurrent university users, backups, replication, migrations, reporting, and reliable transactions. The application must switch through a database adapter or repository layer rather than letting pages issue SQL directly.

## Ownership hierarchy

- `universities` is the top-level tenant.
- `faculties` belongs to one university.
- `groups` belongs to one university and represents a cohort or class.
- `users` belongs to one university and has a role: student, professor, or admin.
- `courses` belongs to one university.
- `enrollments` connects students to groups.
- `teaching_assignments` connects professors, courses, and groups.
- `timetable_entries` connects a university, course, group, and professor.

The numeric `id` columns are primary keys. The `*_id` columns are foreign keys, which are the secondary relationships between records. Do not store university names, faculty names, or student names as the relationship key because names can change and are not guaranteed to be unique.

## Rules for future work

1. Every university-scoped query must include its university ownership condition.
2. Every relationship creation must verify that all referenced records belong to the same university.
3. Use database migrations for schema changes; do not edit the production database manually.
4. Keep passwords as one-way hashes and never return password hashes from an API.
5. Use transactions for imports and multi-record operations.
6. Add indexes for foreign keys and frequent filters.
7. Use PostgreSQL `bigint` or UUID identifiers when creating the production schema. Keep external university, student, and course codes in separate unique columns.
8. Keep a global administrator separate from university-scoped staff. A global admin may have a nullable `university_id`; university administrators should remain scoped to their university.

## Current skeleton status

The SQLite schema includes universities, faculties, users, courses, groups, enrollments, teaching assignments, homework, submissions, timetable entries, and notifications. The admin CRUD panel manages universities, faculties, users, subjects, groups, enrollments, teaching assignments, and timetable entries. Use `npm run db:migrate` for repeatable local schema updates. Bulk import and reporting should be added before national rollout.
