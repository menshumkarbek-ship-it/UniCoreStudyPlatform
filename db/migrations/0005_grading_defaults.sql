-- Any grading component can be renamed or deleted, so "where new homework / new exams go" becomes a setting that can
-- sit on any component (one per university for each), instead of a fixed kind that pinned two components in place.
ALTER TABLE grading_components ADD COLUMN default_homework boolean NOT NULL DEFAULT false;
ALTER TABLE grading_components ADD COLUMN default_exams boolean NOT NULL DEFAULT false;
UPDATE grading_components SET default_homework = (kind = 'homework'), default_exams = (kind = 'exam');
CREATE UNIQUE INDEX grading_components_default_homework_key ON grading_components (university_id) WHERE default_homework;
CREATE UNIQUE INDEX grading_components_default_exams_key ON grading_components (university_id) WHERE default_exams;
DROP INDEX grading_components_default_kind_key;
ALTER TABLE grading_components DROP COLUMN kind;
