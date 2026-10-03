-- A subject's syllabus, and its class plan: lessons grouped by week, each with a topic and teaching materials
-- (uploaded files such as presentations and videos, or links). Both belong to the subject, shared by all its groups.
ALTER TABLE courses ADD COLUMN syllabus text NOT NULL DEFAULT '';

CREATE TABLE course_lessons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id bigint NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  week integer NOT NULL CHECK (week BETWEEN 1 AND 60),
  position integer NOT NULL DEFAULT 0,
  topic text NOT NULL CHECK (length(trim(topic)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_lessons_course_idx ON course_lessons (course_id, week, position, id);

CREATE TABLE lesson_materials (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id bigint NOT NULL REFERENCES course_lessons (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  -- Either a link (url) or an uploaded file (file_*), never both.
  url text,
  file_name text,
  file_path text,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((url IS NOT NULL) <> (file_path IS NOT NULL))
);
CREATE INDEX lesson_materials_lesson_idx ON lesson_materials (lesson_id, id);
