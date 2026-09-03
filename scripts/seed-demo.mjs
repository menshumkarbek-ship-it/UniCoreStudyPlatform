import { DatabaseSync } from "node:sqlite";
const database = new DatabaseSync("data/tronsabak.sqlite");
const university = database.prepare("SELECT id FROM universities WHERE name = ?").get("Ala-Too International University");
if (!university) throw new Error("Initialize the app or call /api/universities before seeding.");
const universityId = university.id;
const professor = database.prepare("SELECT id FROM users WHERE university_id = ? AND role = 'professor' ORDER BY id LIMIT 1").get(universityId);
const student = database.prepare("SELECT id FROM users WHERE university_id = ? AND role = 'student' LIMIT 1").get(universityId);
const professors = [
  ["professor@tronsabak.dev", "Dr. A. Karimov"],
  ["professor2@tronsabak.dev", "Prof. B. Sulaimanova"],
  ["professor3@tronsabak.dev", "Dr. N. Toktonaliev"],
  ["professor4@tronsabak.dev", "Prof. M. Abdykadyrov"]
];
for (const [email, fullName] of professors) {
  database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'professor')").run(universityId, email, fullName, hashSync("Professor123!", 12));
}
const courses = [["MED101", "Human Anatomy"], ["MED112", "Human Physiology"], ["MED203", "Medical Biochemistry"]];
const groups = ["MED-24A", "MED-24B", "MED-23B"];
for (const [code, title] of courses) database.prepare("INSERT OR IGNORE INTO courses (university_id, code, title) VALUES (?, ?, ?)").run(universityId, code, title);
for (const name of groups) database.prepare("INSERT OR IGNORE INTO groups (university_id, name) VALUES (?, ?)").run(universityId, name);
const courseId = (code) => database.prepare("SELECT id FROM courses WHERE university_id = ? AND code = ?").get(universityId, code).id;
const groupId = (name) => database.prepare("SELECT id FROM groups WHERE university_id = ? AND name = ?").get(universityId, name).id;
const assignments = [["MED101", "MED-24A"], ["MED101", "MED-24B"], ["MED112", "MED-24B"], ["MED203", "MED-23B"]];
for (const [code, group] of assignments) database.prepare("INSERT OR IGNORE INTO teaching_assignments (professor_id, course_id, group_id) VALUES (?, ?, ?)").run(professor.id, courseId(code), groupId(group));
database.prepare("INSERT OR IGNORE INTO enrollments (user_id, group_id) VALUES (?, ?)").run(student.id, groupId("MED-24A"));
const homework = [["MED101", "MED-24A", "Cardiovascular case study", "Explain the clinical signs, likely diagnosis, and first-line investigations.", "2026-09-08T23:59:00.000Z", 20], ["MED112", "MED-24B", "Respiratory physiology notes", "Submit a one-page summary comparing ventilation, perfusion, and gas exchange.", "2026-09-11T23:59:00.000Z", 15], ["MED203", "MED-23B", "Enzyme kinetics worksheet", "Complete questions 1-8 and show the working for each calculation.", "2026-09-05T23:59:00.000Z", 10]];
for (const [code, group, title, instructions, dueAt, points] of homework) database.prepare("INSERT OR IGNORE INTO homework (course_id, group_id, created_by, title, instructions, due_at, points) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM homework WHERE title = ? AND group_id = ?)").run(courseId(code), groupId(group), professor.id, title, instructions, dueAt, points, title, groupId(group));
console.log("Demo database seeded.");
