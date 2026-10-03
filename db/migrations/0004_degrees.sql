-- Degrees a faculty offers (e.g. Bachelor, Master, Specialist), typed by the admin when creating the faculty.
ALTER TABLE faculties ADD COLUMN degrees text[] NOT NULL DEFAULT '{}';

-- Each group follows one of its faculty's degrees and has a year of study. The year is free text, since programmes
-- differ in length and naming (medical groups study six years, some count an internship year).
ALTER TABLE groups ADD COLUMN degree text CHECK (degree IS NULL OR length(trim(degree)) > 0);
ALTER TABLE groups ADD COLUMN study_year text CHECK (study_year IS NULL OR length(trim(study_year)) > 0);
