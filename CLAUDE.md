@AGENTS.md

# UniCore backend and the mobile app

This repo is the **one backend** for both the website and the mobile app (a separate repo). The backend is the Next.js route handlers in `src/app/api/**/route.ts` plus `src/lib/*` and `db/migrations`. The mobile app must never get its own backend: if it needs an endpoint or field that does not exist, add it here, and keep changes additive so the website and the app do not break each other.

- **Base URL:** the deployed Render service (ask the repo owner for it). Everything is JSON under `/api`.
- **Mobile login:** `POST /api/auth/login` with `"client": "mobile"` in the body returns `{ token, expiresIn }` and sets no cookie. Send the token as `Authorization: Bearer <token>` on every other request. Without `client: "mobile"` the API uses the browser cookie. There is no refresh endpoint: on `401`, send the user back to sign-in. Tokens last 7 days and stop working on logout or password change (`PATCH /api/auth/password` returns a new token to bearer clients).
- **Roles:** the app is for `student` and `professor`. `admin` and `/api/admin/*` are website-only.
- **Files:** downloads (`/api/homework/{id}/file`, `/api/exams/{id}/file`, `/api/materials/{id}/file`, `/api/users/{id}/photo`) need the `Authorization` header, so fetch them with an authenticated request and open the saved file. Do not pass the bare URL to an image view or WebView. Uploads are `multipart/form-data`.
- **Notifications:** there is no push yet. The app polls `GET /api/notifications`.
- **Conventions:** errors are `{ "error": "<English message>" }` with the HTTP status; weekdays are ISO (1 = Monday … 7 = Sunday); times are `HH:MM` in the university's time zone (`user.timezone`); "today" comes from the server, not the phone.
- **Rules live in `docs/data-architecture.md`** (ownership, offerings, who may do what) and in the route files. Read them instead of guessing.
- **Never run `npm run db:seed-demo` against the production database.** It deletes all data.
