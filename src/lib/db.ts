import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashSync } from "bcryptjs";

const databaseDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "tronsabak.sqlite");

type DatabaseState = { database: DatabaseSync; initialized: boolean };
const globalForDatabase = globalThis as typeof globalThis & { tronsabakDatabase?: DatabaseState };

function createDatabase() {
  mkdirSync(databaseDirectory, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
      student_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (university_id, email),
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      faculty_id INTEGER,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (university_id, code),
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (university_id, name),
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS teaching_assignments (
      professor_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (professor_id, course_id, group_id),
      FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS course_professors (
      course_id INTEGER NOT NULL,
      professor_id INTEGER NOT NULL,
      PRIMARY KEY (course_id, professor_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      due_at TEXT NOT NULL,
      points INTEGER NOT NULL CHECK (points > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS homework_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'graded')) DEFAULT 'draft',
      submitted_at TEXT,
      grade INTEGER,
      UNIQUE (homework_id, student_id),
      FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      professor_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      room TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      recipient_id INTEGER,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      href TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_faculties_university_id ON faculties(university_id);
    CREATE INDEX IF NOT EXISTS idx_users_university_role ON users(university_id, role);
    CREATE INDEX IF NOT EXISTS idx_courses_university_id ON courses(university_id);
    CREATE INDEX IF NOT EXISTS idx_groups_university_id ON groups(university_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_group_id ON enrollments(group_id);
    CREATE INDEX IF NOT EXISTS idx_teaching_assignments_course_group ON teaching_assignments(course_id, group_id);
    CREATE INDEX IF NOT EXISTS idx_course_professors_professor_id ON course_professors(professor_id);
    CREATE INDEX IF NOT EXISTS idx_timetable_university_weekday ON timetable_entries(university_id, weekday);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at);
  `);
  const courseColumns = database.prepare("PRAGMA table_info(courses)").all().map((column) => column.name);
  if (!courseColumns.includes("faculty_id")) database.exec("ALTER TABLE courses ADD COLUMN faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL");
  database.exec("CREATE INDEX IF NOT EXISTS idx_courses_faculty_id ON courses(faculty_id)");
  seedDatabase(database);
  return database;
}

function seedDatabase(database: DatabaseSync) {
  const universityCountRow = database.prepare("SELECT COUNT(*) AS count FROM universities").get() as { count: number };
  const universityCount = Number(universityCountRow.count);
  if (universityCount > 0) {
    const university = database.prepare("SELECT id FROM universities WHERE name = ?").get("Ala-Too International University") as { id: number } | undefined;
    if (university) {
      database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')").run(university.id, "admin@tronsabak.dev", "TronSabak Administrator", hashSync("Professor123!", 12));
      const professors = [
        ["professor@tronsabak.dev", "Dr. A. Karimov"],
        ["professor2@tronsabak.dev", "Prof. B. Sulaimanova"],
        ["professor3@tronsabak.dev", "Dr. N. Toktonaliev"],
        ["professor4@tronsabak.dev", "Prof. M. Abdykadyrov"]
      ];
      const insertProfessor = database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'professor')");
      for (const [email, fullName] of professors) insertProfessor.run(university.id, email, fullName, hashSync("Professor123!", 12));
      database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role, student_id) VALUES (?, ?, ?, ?, 'student', ?)").run(university.id, "student@tronsabak.dev", "Aibek Temirov", hashSync("Professor123!", 12), "AIU-24-0107");
    }
    return;
  }
  const addUniversity = database.prepare("INSERT INTO universities (name, city) VALUES (?, ?)");
  const universities = [["Ala-Too International University", "Bishkek"], ["Kyrgyz State Medical Academy", "Bishkek"], ["Kyrgyz-Turkish Manas University", "Bishkek"], ["Osh State University", "Osh"], ["Jalal-Abad State University", "Jalal-Abad"]];
  for (const university of universities) addUniversity.run(...university);
  const universityRow = database.prepare("SELECT id FROM universities WHERE name = ?").get("Ala-Too International University") as { id: number };
  const universityId = Number(universityRow.id);
  const admin = database.prepare("INSERT INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')");
  admin.run(universityId, "admin@tronsabak.dev", "TronSabak Administrator", hashSync("Professor123!", 12));
  const professors = [
    ["professor@tronsabak.dev", "Dr. A. Karimov"],
    ["professor2@tronsabak.dev", "Prof. B. Sulaimanova"],
    ["professor3@tronsabak.dev", "Dr. N. Toktonaliev"],
    ["professor4@tronsabak.dev", "Prof. M. Abdykadyrov"]
  ];
  const insertProfessor = database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'professor')");
  for (const [email, fullName] of professors) insertProfessor.run(universityId, email, fullName, hashSync("Professor123!", 12));
  const student = database.prepare("INSERT INTO users (university_id, email, full_name, password_hash, role, student_id) VALUES (?, ?, ?, ?, 'student', ?)");
  student.run(universityId, "student@tronsabak.dev", "Aibek Temirov", hashSync("Professor123!", 12), "AIU-24-0107");
}

export function getDatabase() {
  if (!globalForDatabase.tronsabakDatabase) globalForDatabase.tronsabakDatabase = { database: createDatabase(), initialized: true };
  return globalForDatabase.tronsabakDatabase.database;
}
