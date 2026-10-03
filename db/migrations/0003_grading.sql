-- Grading schemes. Each university splits a subject's final score (100 points) between weighted components such as
-- homework, a midterm, a final, and other exams. Every homework assignment and exam counts toward one component;
-- a component's share is earned in proportion to the student's average percentage across its items.
CREATE TABLE grading_components (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id bigint NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  -- New homework and new exams fall into the university's 'homework' and 'exam' components unless the professor
  -- picks another, so each university keeps exactly one of each; any others are 'custom' (midterm, final, project…).
  kind text NOT NULL CHECK (kind IN ('homework', 'exam', 'custom')),
  weight numeric(5, 2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  position integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX grading_components_name_key ON grading_components (university_id, lower(name));
CREATE UNIQUE INDEX grading_components_default_kind_key ON grading_components (university_id, kind) WHERE kind <> 'custom';

INSERT INTO grading_components (university_id, name, kind, weight, position)
SELECT u.id, c.name, c.kind, c.weight, c.position
  FROM universities u
 CROSS JOIN (VALUES ('Homework', 'homework', 30, 1), ('Midterm exam', 'custom', 20, 2), ('Final exam', 'custom', 20, 3), ('Exams', 'exam', 30, 4)) AS c (name, kind, weight, position);

ALTER TABLE homework ADD COLUMN component_id bigint REFERENCES grading_components (id) ON DELETE RESTRICT;
UPDATE homework h SET component_id = gc.id
  FROM courses c JOIN grading_components gc ON gc.university_id = c.university_id AND gc.kind = 'homework'
 WHERE c.id = h.course_id;
ALTER TABLE homework ALTER COLUMN component_id SET NOT NULL;
CREATE INDEX homework_component_idx ON homework (component_id);

-- Exams now carry a maximum score, so results can be turned into a percentage like homework grades.
ALTER TABLE exams ADD COLUMN points integer NOT NULL DEFAULT 100 CHECK (points > 0);
ALTER TABLE exams ADD COLUMN component_id bigint REFERENCES grading_components (id) ON DELETE RESTRICT;
UPDATE exams x SET component_id = gc.id
  FROM courses c JOIN grading_components gc ON gc.university_id = c.university_id AND gc.kind = 'exam'
 WHERE c.id = x.course_id;
ALTER TABLE exams ALTER COLUMN component_id SET NOT NULL;
CREATE INDEX exams_component_idx ON exams (component_id);

CREATE TABLE exam_results (
  exam_id bigint NOT NULL REFERENCES exams (id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  feedback text,
  graded_at timestamptz NOT NULL DEFAULT now(),
  graded_by bigint REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (exam_id, student_id)
);
CREATE INDEX exam_results_student_idx ON exam_results (student_id);
