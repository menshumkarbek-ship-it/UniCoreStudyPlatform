# UniCore

A study platform for universities. A platform administrator adds universities; each university then runs its own faculties, groups, professors, students, subjects, and timetable. Students and professors share one workspace (dashboard, subjects, timetable, homework, exams, grades, attendance, bulletin); the public landing page is at `/`.

Built with Next.js 16 (App Router), PostgreSQL, and Tailwind CSS 4.

## Getting started

Requirements: Node.js 24+ and either Docker or a PostgreSQL 14+ server.

```bash
npm install
cp .env.example .env.local        # then set AUTH_SECRET (see the file for a generator)
npm run db:up                     # starts PostgreSQL in Docker on 127.0.0.1:5433
npm run db:migrate                # creates the schema
npm run admin:create -- --email you@example.kg --name "Your Name"   # prompts for a password
npm run dev
```

Open http://localhost:3000/admin/login, sign in as the admin, add a university, and set it up in this order: faculties → groups → professors → students → subjects → timetable. Students and professors then sign in at `/login`.

To use an existing PostgreSQL server instead of Docker, point `DATABASE_URL` in `.env.local` at it and skip `npm run db:up`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:up` | Start the local PostgreSQL container |
| `npm run db:migrate` | Apply pending migrations from `db/migrations` (safe to run on every deploy) |
| `npm run admin:create -- --email … --name …` | Create a platform admin, or reset an existing admin's password |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run i18n:check` | Check that en/ru/ky dictionaries have the same keys |

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes in production | At least 32 random characters; signs session cookies |
| `UPLOAD_DIR` | no | Where uploaded files go (default `./data/uploads`). Use persistent storage in production. |
| `DATABASE_POOL_SIZE` | no | Connection pool size (default 10) |

There is no seed or demo data: every record is created through the admin panel.

## How the data fits together

See [docs/data-architecture.md](docs/data-architecture.md). In short: a **subject** belongs to one **professor** and is taken by one or more **groups**; each **student** is in one group. The timetable, homework, exams, attendance, and announcements all hang off a (subject, group) pair, so a professor's timetable and a student's timetable are both derived from that data.

## Project layout

```
db/migrations/          SQL migrations, applied in filename order
scripts/                migrate.mjs, create-admin.mjs, check-i18n-keys.mjs
src/app/(workspace)/    student and professor pages (shared layout with sidebar)
src/app/admin/          platform admin panel and admin sign-in
src/app/api/            route handlers
src/lib/                db, auth, http helpers, file storage, rate limiting, time helpers
src/components/         shared UI
src/i18n/               en / ru / ky dictionaries
```
