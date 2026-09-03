import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const databaseDirectory = path.join(process.cwd(), "data");
mkdirSync(databaseDirectory, { recursive: true });
const database = new DatabaseSync(path.join(databaseDirectory, "tronsabak.sqlite"));
database.exec("PRAGMA foreign_keys = ON;");
database.exec(`
  CREATE TABLE IF NOT EXISTS universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS faculties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (university_id, name),
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_faculties_university_id ON faculties(university_id);
`);
const courseColumns = database.prepare("PRAGMA table_info(courses)").all().map((column) => column.name);
if (!courseColumns.includes("faculty_id")) database.exec("ALTER TABLE courses ADD COLUMN faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL");
database.exec("CREATE INDEX IF NOT EXISTS idx_courses_faculty_id ON courses(faculty_id)");
database.exec("CREATE TABLE IF NOT EXISTS course_professors (course_id INTEGER NOT NULL, professor_id INTEGER NOT NULL, PRIMARY KEY (course_id, professor_id), FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE)");
database.exec("CREATE INDEX IF NOT EXISTS idx_course_professors_professor_id ON course_professors(professor_id)");
console.log("Database migrations complete.");
