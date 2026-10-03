-- UniCore initial schema.
--
-- Tenancy: every university-owned row carries university_id, and relationships
-- use composite foreign keys (id, university_id) so the database itself refuses
-- links that cross universities.
--
-- Teaching model: a course (subject) belongs to exactly one professor and is
-- offered to one or more groups through course_groups. Timetable entries,
-- homework, exams, and attendance all hang off a (course, group) offering, so a
-- professor's timetable is derived from the courses they own.

CREATE TABLE universities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  city text NOT NULL CHECK (length(trim(city)) > 0),
  timezone text NOT NULL DEFAULT 'Asia/Bishkek',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX universities_name_key ON universities (lower(name));

CREATE TABLE faculties (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id bigint NOT NULL REFERENCES universities (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, university_id)
);
CREATE UNIQUE INDEX faculties_university_name_key ON faculties (university_id, lower(name));

CREATE TABLE groups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id bigint NOT NULL REFERENCES universities (id) ON DELETE RESTRICT,
  faculty_id bigint NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, university_id),
  FOREIGN KEY (faculty_id, university_id) REFERENCES faculties (id, university_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX groups_university_name_key ON groups (university_id, lower(name));
CREATE INDEX groups_faculty_id_idx ON groups (faculty_id);

-- Platform administrators have no university; students and professors always do.
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id bigint REFERENCES universities (id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('admin', 'professor', 'student')),
  email text NOT NULL CHECK (email = lower(email) AND position('@' IN email) > 1),
  full_name text NOT NULL CHECK (length(trim(full_name)) > 0),
  password_hash text NOT NULL,
  student_number text,
  photo_path text,
  token_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, university_id),
  CHECK ((role = 'admin') = (university_id IS NULL)),
  CHECK (role = 'student' OR student_number IS NULL)
);
CREATE UNIQUE INDEX users_university_email_key ON users (university_id, email) WHERE university_id IS NOT NULL;
CREATE UNIQUE INDEX users_admin_email_key ON users (email) WHERE role = 'admin';
CREATE UNIQUE INDEX users_university_student_number_key ON users (university_id, student_number) WHERE student_number IS NOT NULL;
CREATE INDEX users_university_role_idx ON users (university_id, role);

-- A student belongs to exactly one group.
CREATE TABLE enrollments (
  student_id bigint PRIMARY KEY,
  group_id bigint NOT NULL,
  university_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id, university_id) REFERENCES users (id, university_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id, university_id) REFERENCES groups (id, university_id) ON DELETE RESTRICT
);
CREATE INDEX enrollments_group_id_idx ON enrollments (group_id);

CREATE TABLE courses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id bigint NOT NULL REFERENCES universities (id) ON DELETE RESTRICT,
  faculty_id bigint,
  professor_id bigint NOT NULL,
  code text NOT NULL CHECK (length(trim(code)) > 0),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, university_id),
  FOREIGN KEY (faculty_id, university_id) REFERENCES faculties (id, university_id) ON DELETE RESTRICT,
  FOREIGN KEY (professor_id, university_id) REFERENCES users (id, university_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX courses_university_code_key ON courses (university_id, lower(code));
CREATE INDEX courses_professor_id_idx ON courses (professor_id);
CREATE INDEX courses_faculty_id_idx ON courses (faculty_id);

-- Which groups take a course. Everything group-specific references this pair.
CREATE TABLE course_groups (
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  university_id bigint NOT NULL,
  PRIMARY KEY (course_id, group_id),
  FOREIGN KEY (course_id, university_id) REFERENCES courses (id, university_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id, university_id) REFERENCES groups (id, university_id) ON DELETE CASCADE
);
CREATE INDEX course_groups_group_id_idx ON course_groups (group_id);

-- weekday uses ISO numbering: 1 = Monday ... 7 = Sunday.
CREATE TABLE timetable_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  room text NOT NULL CHECK (length(trim(room)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (course_id, group_id) REFERENCES course_groups (course_id, group_id) ON DELETE CASCADE
);
CREATE INDEX timetable_entries_group_weekday_idx ON timetable_entries (group_id, weekday);
CREATE INDEX timetable_entries_course_id_idx ON timetable_entries (course_id);

CREATE TABLE homework (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  created_by bigint NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  instructions text NOT NULL,
  due_at timestamptz NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (course_id, group_id) REFERENCES course_groups (course_id, group_id) ON DELETE RESTRICT
);
CREATE INDEX homework_group_due_idx ON homework (group_id, due_at);
CREATE INDEX homework_course_id_idx ON homework (course_id);

CREATE TABLE homework_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  homework_id bigint NOT NULL REFERENCES homework (id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('submitted', 'graded')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  grade integer CHECK (grade >= 0),
  feedback text,
  graded_at timestamptz,
  graded_by bigint REFERENCES users (id) ON DELETE SET NULL,
  UNIQUE (homework_id, student_id),
  CHECK ((status = 'graded') = (grade IS NOT NULL))
);
CREATE INDEX homework_submissions_student_id_idx ON homework_submissions (student_id);

CREATE TABLE attendance_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  timetable_entry_id bigint REFERENCES timetable_entries (id) ON DELETE SET NULL,
  opened_by bigint NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  session_date date NOT NULL,
  code char(6) NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timetable_entry_id, session_date),
  UNIQUE (session_date, code),
  FOREIGN KEY (course_id, group_id) REFERENCES course_groups (course_id, group_id) ON DELETE RESTRICT
);
CREATE INDEX attendance_sessions_group_date_idx ON attendance_sessions (group_id, session_date);

CREATE TABLE attendance_records (
  session_id bigint NOT NULL REFERENCES attendance_sessions (id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, student_id)
);
CREATE INDEX attendance_records_student_id_idx ON attendance_records (student_id);

CREATE TABLE exams (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  timetable_entry_id bigint REFERENCES timetable_entries (id) ON DELETE SET NULL,
  created_by bigint NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  exam_date date NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (course_id, group_id) REFERENCES course_groups (course_id, group_id) ON DELETE RESTRICT
);
CREATE INDEX exams_group_date_idx ON exams (group_id, exam_date);
CREATE INDEX exams_course_id_idx ON exams (course_id);

CREATE TABLE announcements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL,
  group_id bigint NOT NULL,
  created_by bigint NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (course_id, group_id) REFERENCES course_groups (course_id, group_id) ON DELETE CASCADE
);
CREATE INDEX announcements_group_created_idx ON announcements (group_id, created_at DESC);

CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL,
  detail text NOT NULL,
  href text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_created_idx ON notifications (recipient_id, created_at DESC);

-- Sliding-window counters for login and attendance-code throttling.
CREATE TABLE rate_limit_events (
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_events_bucket_created_idx ON rate_limit_events (bucket, created_at);
