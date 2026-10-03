// Replaces ALL data (except platform admin accounts) with one fully populated demo university, for trying every feature.
//
//   npm run db:seed-demo -- --yes
//
// Every professor is profN@gmail.com and every student studN@gmail.com (N = 1, 2, 3, …); all share one password.
// Dates are relative to today, so the demo always has past, current and upcoming work.
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });
if (!values.yes) {
  console.error("This deletes every university, user (except platform admins), and upload. Re-run with --yes to confirm.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }

const PASSWORD = "411855470";
const TZ = "Asia/Bishkek";
const OFFSET = "+06:00";
const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"));

// ---------- helpers ----------
let seed = 20261003;
const random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const between = (low, high) => low + Math.floor(random() * (high - low + 1));
const chance = (p) => random() < p;
const pad = (n, size = 2) => String(n).padStart(size, "0");
const plusMinutes = (time, minutes) => { const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes; return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`; };

const nowParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
const today = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
const nowTime = `${nowParts.hour}:${nowParts.minute}`;
const addDays = (date, days) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const isoWeekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
const at = (date, time) => `${date}T${time}:00${OFFSET}`;
/** The latest date on or before `today - daysAgo` that falls on `weekday`. */
const lastOn = (weekday, daysAgo) => { let date = addDays(today, -daysAgo); while (isoWeekday(date) !== weekday) date = addDays(date, -1); return date; };
/** The earliest date on or after `today + daysAhead` that falls on `weekday`. */
const nextOn = (weekday, daysAhead) => { let date = addDays(today, daysAhead); while (isoWeekday(date) !== weekday) date = addDays(date, 1); return date; };
const shortDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function makePdf(lines) {
  const escape = (text) => text.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
  const stream = `BT /F1 16 Tf 56 760 Td 20 TL ${lines.map((line) => `(${escape(line)}) Tj T*`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${pad(offset, 10)} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}
async function storeFile(folder, lines) {
  const relative = path.posix.join(folder, `${randomUUID()}.pdf`);
  const target = path.join(uploadRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  const buffer = makePdf(lines);
  await writeFile(target, buffer);
  return { path: relative, size: buffer.length };
}

// ---------- the demo's content ----------
const maleNames = ["Aibek", "Nurlan", "Bakyt", "Timur", "Ermek", "Azamat", "Emil", "Ulan", "Bektur", "Samat", "Adilet", "Daniyar", "Kubat", "Myktybek", "Ilyas", "Arslan", "Eldar", "Mirbek", "Rustam", "Sultan", "Beknazar", "Marat", "Talant", "Zhoomart"];
const femaleNames = ["Aida", "Aigerim", "Elena", "Aliya", "Cholpon", "Gulnara", "Meerim", "Kanykei", "Aizada", "Nazira", "Begimai", "Zhanyl", "Asel", "Tolgonai", "Saikal", "Dinara", "Nuraiym", "Altynai", "Jyldyz", "Perizat", "Venera", "Mavluda", "Aisuluu", "Burul"];
const surnames = ["Kadyrov", "Toktogulov", "Asanov", "Akmatov", "Sydykov", "Osmonov", "Zhunusov", "Alymkulov", "Bekov", "Isaev", "Joldoshev", "Mamytov", "Nurmatov", "Orozov", "Sadykov", "Turdubaev", "Usenov", "Zhakypov", "Abdyrov", "Baiterekov", "Chynybaev", "Dyikanov"];
const personName = (index, female) => {
  const first = (female ? femaleNames : maleNames)[index % maleNames.length];
  const surname = surnames[(index * 7 + (female ? 3 : 0)) % surnames.length];
  return `${first} ${female ? `${surname}a` : surname}`;
};

const faculties = [
  { name: "Faculty of Medicine", degrees: ["Specialist"] },
  { name: "Faculty of Computer Science", degrees: ["Bachelor", "Master"] },
  { name: "Faculty of Economics", degrees: ["Bachelor"] },
];
const groups = [
  { name: "MED-101", faculty: 0, degree: "Specialist", year: "1st year", size: 6 },
  { name: "MED-201", faculty: 0, degree: "Specialist", year: "2nd year", size: 6 },
  { name: "CS-101", faculty: 1, degree: "Bachelor", year: "1st year", size: 6 },
  { name: "CS-301", faculty: 1, degree: "Bachelor", year: "3rd year", size: 6 },
  { name: "CS-M1", faculty: 1, degree: "Master", year: "1st year", size: 5 },
  { name: "ECO-101", faculty: 2, degree: "Bachelor", year: "1st year", size: 6 },
  { name: "ECO-201", faculty: 2, degree: "Bachelor", year: "2nd year", size: 6 },
];
const unassignedStudents = 3;
const professorCount = 11; // the last one teaches nothing yet, to see the empty states
const roomPrefix = ["M", "C", "E"];

const courses = [
  { code: "MED101", title: "Human Anatomy", faculty: 0, prof: 1, groups: ["MED-101", "MED-201"], perWeek: 2, topics: ["Skeletal system", "Skull and spine", "Muscular system", "Upper limb", "Lower limb", "Cardiovascular system", "Respiratory system", "Digestive system"], about: "Structure of the human body, studied by system. Weekly lectures with practical sessions in the anatomy lab." },
  { code: "MED102", title: "Biochemistry", faculty: 0, prof: 2, groups: ["MED-101"], perWeek: 2, topics: ["Amino acids and proteins", "Enzymes", "Carbohydrate metabolism", "Lipid metabolism", "Nucleic acids", "Vitamins", "Hormones", "Clinical biochemistry"], about: "Chemical processes of living organisms and their role in health and disease." },
  { code: "MED201", title: "Physiology", faculty: 0, prof: 3, groups: ["MED-201"], perWeek: 2, topics: ["Cell physiology", "Nervous system", "Blood and circulation", "Respiration", "Digestion", "Kidney function", "Endocrine system", "Sensory systems"], about: "How the organs and systems of the body work and are regulated." },
  { code: "CS101", title: "Programming Fundamentals", faculty: 1, prof: 4, groups: ["CS-101", "CS-M1"], perWeek: 2, topics: ["Variables and types", "Control flow", "Functions", "Arrays and strings", "Recursion", "Files and errors", "Objects", "Testing"], about: "Writing correct, readable programs: the building blocks every later course relies on." },
  { code: "CS201", title: "Data Structures", faculty: 1, prof: 5, groups: ["CS-101", "CS-301"], perWeek: 2, topics: ["Complexity", "Linked lists", "Stacks and queues", "Trees", "Hash tables", "Heaps", "Graphs", "Sorting"], about: "Core data structures, how to choose between them, and what each costs." },
  { code: "CS301", title: "Databases", faculty: 1, prof: 6, groups: ["CS-301", "CS-M1"], perWeek: 2, topics: ["Relational model", "SQL queries", "Joins", "Normalization", "Transactions", "Indexes", "Query planning", "NoSQL"], about: "Designing and querying relational databases, and what happens underneath." },
  { code: "MATH100", title: "Discrete Mathematics", faculty: 1, prof: 7, groups: ["CS-101"], perWeek: 1, topics: ["Logic", "Sets", "Relations", "Combinatorics", "Graphs", "Number theory"], about: "Logic, sets, counting and graphs: the mathematics behind computing." },
  { code: "ECO101", title: "Microeconomics", faculty: 2, prof: 8, groups: ["ECO-101", "ECO-201"], perWeek: 2, topics: ["Supply and demand", "Elasticity", "Consumer choice", "Production costs", "Perfect competition", "Monopoly", "Market failure", "Game theory"], about: "How households and firms decide, and how markets bring them together." },
  { code: "ECO102", title: "Accounting", faculty: 2, prof: 9, groups: ["ECO-101"], perWeek: 2, topics: ["Double entry", "Balance sheet", "Income statement", "Cash flow", "Inventory", "Depreciation"], about: "Recording, summarising and reading a company's financial transactions." },
  { code: "ECO201", title: "Macroeconomics", faculty: 2, prof: 10, groups: ["ECO-201"], perWeek: 2, topics: ["National income", "Inflation", "Unemployment", "Fiscal policy", "Monetary policy", "Trade", "Growth", "Crises"], about: "The economy as a whole: output, prices, jobs, and the policies that steer them." },
  { code: "GEN100", title: "Academic English", faculty: null, prof: 9, groups: ["MED-101", "CS-101", "ECO-101"], perWeek: 1, topics: ["Academic vocabulary", "Reading research", "Summaries", "Essay structure", "Citations", "Presenting"], about: "English for study: reading, writing and presenting academic work. Open to every faculty." },
];
// Saturday classes (some faculties study on Saturdays): ECO-201 meets Saturday afternoon.
const saturday = [{ course: "ECO101", group: "ECO-201", period: 4 }, { course: "ECO201", group: "ECO-201", period: 5 }];
const bell = [["08:30", "09:50"], ["10:00", "11:20"], ["11:30", "12:50"], ["13:30", "14:50"], ["15:00", "16:20"], ["16:30", "17:50"]];

// ---------- go ----------
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = async (sql, params = []) => (await client.query(sql, params)).rows;
async function insertMany(table, columns, rows, returning = "") {
  const out = [];
  for (let start = 0; start < rows.length; start += 400) {
    const chunk = rows.slice(start, start + 400);
    const params = chunk.flat();
    const placeholders = chunk.map((row, r) => `(${row.map((_, c) => `$${r * columns.length + c + 1}`).join(",")})`).join(",");
    out.push(...await q(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders} ${returning}`, params));
  }
  return out;
}

try {
  console.log("Hashing the shared password…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await client.query("BEGIN");
  for (const table of ["notifications", "attendance_records", "attendance_sessions", "exam_results", "exams", "homework_submissions", "homework", "lesson_materials", "course_lessons", "announcements", "timetable_entries", "course_groups", "enrollments", "courses", "groups", "grading_components", "faculties"]) await client.query(`DELETE FROM ${table}`);
  await client.query("DELETE FROM users WHERE role <> 'admin'");
  await client.query("DELETE FROM universities");
  await client.query("DELETE FROM rate_limit_events");
  for (const folder of ["exams", "homework", "materials", "photos"]) await rm(path.join(uploadRoot, folder), { recursive: true, force: true });

  // University, grading scheme, faculties, groups
  const [university] = await q("INSERT INTO universities (name, city, timezone) VALUES ('UniCore Demo University', 'Bishkek', $1) RETURNING id", [TZ]);
  const uni = university.id;
  const scheme = [["Homework", 30, true, false], ["Midterm exam", 20, false, false], ["Final exam", 20, false, false], ["Exams", 30, false, true]];
  const components = Object.fromEntries((await insertMany("grading_components", ["university_id", "name", "weight", "position", "default_homework", "default_exams"], scheme.map((c, i) => [uni, c[0], c[1], i + 1, c[2], c[3]]), "RETURNING id, name")).map((row) => [row.name, row.id]));
  const facultyRows = await insertMany("faculties", ["university_id", "name", "degrees"], faculties.map((f) => [uni, f.name, f.degrees]), "RETURNING id");
  const groupRows = await insertMany("groups", ["university_id", "faculty_id", "name", "degree", "study_year"], groups.map((g) => [uni, facultyRows[g.faculty].id, g.name, g.degree, g.year]), "RETURNING id, name");
  const groupId = Object.fromEntries(groupRows.map((row) => [row.name, row.id]));

  // People
  const professors = [];
  for (let n = 1; n <= professorCount; n += 1) {
    const female = n % 2 === 1;
    const [row] = await q("INSERT INTO users (university_id, role, email, full_name, password_hash) VALUES ($1, 'professor', $2, $3, $4) RETURNING id", [uni, `prof${n}@gmail.com`, `Dr. ${personName(n + 2, female)}`, passwordHash]);
    professors.push({ id: row.id, n });
  }
  const students = [];
  let studentNumber = 0;
  for (const group of groups) {
    for (let i = 0; i < group.size; i += 1) {
      studentNumber += 1;
      students.push({ n: studentNumber, group: group.name, ordinal: studentNumber - 1 });
    }
  }
  for (let i = 0; i < unassignedStudents; i += 1) { studentNumber += 1; students.push({ n: studentNumber, group: null, ordinal: studentNumber - 1 }); }
  for (const student of students) {
    const female = student.n % 2 === 0;
    const [row] = await q("INSERT INTO users (university_id, role, email, full_name, password_hash, student_number) VALUES ($1, 'student', $2, $3, $4, $5) RETURNING id", [uni, `stud${student.n}@gmail.com`, personName(student.n, female), passwordHash, `2026${pad(student.n, 3)}`]);
    student.id = row.id;
    student.name = personName(student.n, female);
    if (student.group) await q("INSERT INTO enrollments (student_id, group_id, university_id) VALUES ($1, $2, $3)", [student.id, groupId[student.group], uni]);
  }
  const studentsOf = (groupName) => students.filter((student) => student.group === groupName);

  // Subjects: syllabus, and which groups take them
  const pairs = [];
  for (const course of courses) {
    const [row] = await q("INSERT INTO courses (university_id, faculty_id, professor_id, code, title, syllabus) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [uni, course.faculty === null ? null : facultyRows[course.faculty].id, professors[course.prof - 1].id, course.code, course.title,
      `${course.about}\n\nGoals\n• Understand the core ideas of ${course.title.toLowerCase()}.\n• Apply them in homework, quizzes and exams.\n\nSchedule\n${course.perWeek === 1 ? "One class" : "Two classes"} a week.\n\nAssessment\nHomework 30%, midterm 20%, final 20%, quizzes and other exams 30% (see the grading scheme).\n\nAttendance\nCheck in with the code shown in class; frequent absences are reported to the faculty.`]);
    course.id = row.id;
    course.professorId = professors[course.prof - 1].id;
    for (const name of course.groups) {
      await q("INSERT INTO course_groups (course_id, group_id, university_id) VALUES ($1, $2, $3)", [course.id, groupId[name], uni]);
      pairs.push({ course, groupName: name, groupId: groupId[name], entries: [] });
    }
  }

  // Timetable: no clashes for a group, a professor or a room
  const busy = { group: new Set(), prof: new Set(), room: new Set() };
  const groupLoad = new Map();
  const roomsFor = (facultyIndex) => Array.from({ length: 8 }, (_, i) => `${facultyIndex === null ? "A" : roomPrefix[facultyIndex]}${facultyIndex === null ? 1 : facultyIndex + 1}${pad(i + 1)}`);
  const place = (pair, weekday, period) => {
    const rooms = roomsFor(pair.course.faculty);
    const room = rooms.find((candidate) => !busy.room.has(`${weekday}:${period}:${candidate}`));
    busy.group.add(`${pair.groupId}:${weekday}:${period}`); busy.prof.add(`${pair.course.professorId}:${weekday}:${period}`); busy.room.add(`${weekday}:${period}:${room}`);
    groupLoad.set(`${pair.groupId}:${weekday}`, (groupLoad.get(`${pair.groupId}:${weekday}`) ?? 0) + 1);
    pair.entries.push({ weekday, period, room });
  };
  for (const pair of pairs) {
    const fixed = saturday.find((s) => s.course === pair.course.code && s.group === pair.groupName);
    if (fixed) place(pair, 6, fixed.period);
  }
  for (const pair of pairs) {
    while (pair.entries.length < pair.course.perWeek) {
      const used = new Set(pair.entries.map((entry) => entry.weekday));
      const options = [];
      for (let weekday = 1; weekday <= 5; weekday += 1) {
        if (used.has(weekday)) continue;
        for (let period = 0; period < bell.length; period += 1) {
          if (busy.group.has(`${pair.groupId}:${weekday}:${period}`) || busy.prof.has(`${pair.course.professorId}:${weekday}:${period}`)) continue;
          options.push({ weekday, period, load: groupLoad.get(`${pair.groupId}:${weekday}`) ?? 0 });
        }
      }
      options.sort((a, b) => a.load - b.load || a.period - b.period || a.weekday - b.weekday);
      if (!options.length) throw new Error(`No free slot for ${pair.course.code} / ${pair.groupName}`);
      place(pair, options[0].weekday, options[0].period);
    }
    for (const entry of pair.entries) {
      entry.startsAt = bell[entry.period][0]; entry.endsAt = bell[entry.period][1];
      const [row] = await q("INSERT INTO timetable_entries (course_id, group_id, weekday, starts_at, ends_at, room) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [pair.course.id, pair.groupId, entry.weekday, entry.startsAt, entry.endsAt, entry.room]);
      entry.id = row.id;
    }
  }

  // Attendance: sessions for every class held in the last three weeks, students present or absent
  const attendanceRate = (student) => student.n % 7 === 0 ? 0.3 : student.n % 5 === 0 ? 0.55 : student.n % 3 === 0 ? 0.8 : 0.95;
  const usedCodes = new Set();
  const sessionRows = [];
  for (const pair of pairs) {
    for (const entry of pair.entries) {
      for (let back = 0; back <= 21; back += 1) {
        const date = addDays(today, -back);
        if (isoWeekday(date) !== entry.weekday) continue;
        if (date === today && entry.endsAt >= nowTime) continue;
        let code;
        do { code = pad(between(0, 999999), 6); } while (usedCodes.has(`${date}:${code}`));
        usedCodes.add(`${date}:${code}`);
        sessionRows.push({ pair, entry, date, code });
      }
    }
  }
  const sessionIds = await insertMany("attendance_sessions", ["course_id", "group_id", "timetable_entry_id", "opened_by", "session_date", "code", "starts_at", "ends_at", "created_at"],
    sessionRows.map((s) => [s.pair.course.id, s.pair.groupId, s.entry.id, s.pair.course.professorId, s.date, s.code, s.entry.startsAt, s.entry.endsAt, at(s.date, s.entry.startsAt)]), "RETURNING id");
  const recordRows = [];
  sessionRows.forEach((session, index) => {
    for (const student of studentsOf(session.pair.groupName)) {
      if (chance(attendanceRate(student))) recordRows.push([sessionIds[index].id, student.id, at(session.date, plusMinutes(session.entry.startsAt, between(1, 15)))]);
    }
  });
  await insertMany("attendance_records", ["session_id", "student_id", "marked_at"], recordRows);

  // Homework and exams, with submissions and results
  const notifications = [];
  // A read notification was opened a few hours after it arrived; an unread one has no read_at.
  const notify = (recipient, title, detail, href, when, read) => notifications.push([recipient, title, detail.slice(0, 500), href, read ? new Date(new Date(when).getTime() + 4 * 3600_000).toISOString() : null, when]);
  const stamp = (date, time) => at(date, time);
  const homeworkPlan = [
    { name: "Homework 1", points: 10, due: -16, created: -26, mode: "old" },
    { name: "Homework 2", points: 20, due: -2, created: -11, mode: "recent" },
    { name: "Homework 3", points: 20, due: 4, created: -3, mode: "open" },
    { name: "Homework 4", points: 10, due: 12, created: -1, mode: "far" },
  ];
  const feedbackSamples = ["Good work.", "Check the second part again.", "Well argued, but the sources are thin.", "Excellent.", "Please show your steps next time.", null, null, null];
  let submissionFiles = 0;
  for (const pair of pairs) {
    const { course } = pair;
    const roster = studentsOf(pair.groupName);
    for (const plan of homeworkPlan) {
      const dueDate = addDays(today, plan.due);
      const createdDate = addDays(today, plan.created);
      const title = `${plan.name}: ${course.topics[Math.min(homeworkPlan.indexOf(plan) + 1, course.topics.length - 1)]}`;
      const [homework] = await q("INSERT INTO homework (course_id, group_id, created_by, title, instructions, due_at, points, created_at, component_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
        [course.id, pair.groupId, course.professorId, title, `Solve the tasks on the attached topic and upload your work as a PDF or an image. Late work is not accepted. Topic: ${course.topics[Math.min(homeworkPlan.indexOf(plan), course.topics.length - 1)]}.`, at(dueDate, "23:59"), plan.points, stamp(createdDate, "09:00"), components.Homework]);
      const announce = (recipient, read) => notify(recipient, `New homework: ${title}`, `${course.code} · due ${shortDate(dueDate)}`, "/homework", stamp(createdDate, "09:00"), read);
      announce(course.professorId, plan.created < -5);
      for (const student of roster) announce(student.id, plan.created < -5);
      for (const student of roster) {
        const submitted = plan.mode === "old" ? chance(0.85) : plan.mode === "recent" ? chance(0.75) : plan.mode === "open" ? chance(0.4) : false;
        if (!submitted) continue;
        const submittedDate = plan.mode === "open" ? addDays(today, -between(0, 2)) : plan.mode === "recent" ? addDays(dueDate, -between(0, 3)) : addDays(dueDate, -between(0, 6));
        const graded = plan.mode === "old" ? true : plan.mode === "recent" ? chance(0.5) : false;
        const file = await storeFile(`homework/${homework.id}`, [`${course.code} ${title}`, `Submitted by ${student.name}`, "Demo submission."]);
        submissionFiles += 1;
        const grade = graded ? Math.round(plan.points * (0.5 + random() * 0.5)) : null;
        const feedback = graded ? feedbackSamples[between(0, feedbackSamples.length - 1)] : null;
        const gradedDay = addDays(dueDate, between(1, 3));
        const gradedAt = graded ? stamp(gradedDay > today ? today : gradedDay, "15:00") : null;
        await q("INSERT INTO homework_submissions (homework_id, student_id, status, submitted_at, file_name, file_path, file_type, file_size, grade, feedback, graded_at, graded_by) VALUES ($1,$2,$3,$4,$5,$6,'application/pdf',$7,$8,$9,$10,$11)",
          [homework.id, student.id, graded ? "graded" : "submitted", stamp(submittedDate, `${pad(between(8, 22))}:${pad(between(0, 59))}`), `${student.name.split(" ")[0].toLowerCase()}-${plan.name.toLowerCase().replace(" ", "")}.pdf`, file.path, file.size, grade, feedback, gradedAt, graded ? course.professorId : null]);
        if (graded) notify(student.id, `Graded: ${title}`, `${course.code} · ${grade}/${plan.points}${feedback ? ` · ${feedback}` : ""}`, "/grades", gradedAt, plan.due < -8);
        else notify(course.professorId, `Submitted: ${title}`, `${student.name} · ${course.code}`, `/homework?open=${homework.id}`, stamp(submittedDate, "12:00"), false);
      }
    }

    // Exams on the days this class meets, inside its time slot
    const entry = (offset) => pair.entries[offset % pair.entries.length];
    const examPlan = [
      { title: "Midterm exam", component: "Midterm exam", points: 100, date: lastOn(entry(0).weekday, 15), entry: entry(0), results: "all", created: -30 },
      { title: "Quiz 1", component: "Exams", points: 20, date: lastOn(entry(1).weekday, 5), entry: entry(1), results: "some", created: -14 },
      { title: "Quiz 2", component: "Exams", points: 20, date: nextOn(entry(0).weekday, 3), entry: entry(0), results: "none", created: -2 },
      { title: "Final exam", component: "Final exam", points: 100, date: nextOn(entry(1).weekday, 17), entry: entry(1), results: "none", created: -1 },
    ];
    for (const plan of examPlan) {
      const file = await storeFile(`exams/${course.id}`, [`${course.code} ${course.title}`, plan.title, `Group ${pair.groupName}`, `${plan.date} ${plan.entry.startsAt}-${plan.entry.endsAt}`]);
      const createdDate = addDays(today, plan.created);
      const [exam] = await q("INSERT INTO exams (course_id, group_id, timetable_entry_id, created_by, title, exam_date, starts_at, ends_at, file_name, file_path, file_type, file_size, points, component_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'application/pdf',$11,$12,$13,$14) RETURNING id",
        [course.id, pair.groupId, plan.entry.id, course.professorId, plan.title, plan.date, plan.entry.startsAt, plan.entry.endsAt, `${course.code}-${plan.title.toLowerCase().replace(/ /g, "-")}.pdf`, file.path, file.size, plan.points, components[plan.component], stamp(createdDate, "10:00")]);
      const detail = `${course.code} · ${plan.date} · ${plan.entry.startsAt}–${plan.entry.endsAt}`;
      notify(course.professorId, `New exam: ${plan.title}`, detail, "/exams", stamp(createdDate, "10:00"), plan.created < -5);
      for (const student of roster) notify(student.id, `New exam: ${plan.title}`, detail, "/exams", stamp(createdDate, "10:00"), plan.created < -5);
      if (plan.results === "none") continue;
      const gradedStudents = plan.results === "all" ? roster : roster.slice(0, Math.ceil(roster.length / 2));
      for (const student of gradedStudents) {
        const score = Math.round(plan.points * (0.35 + random() * 0.65));
        const feedback = chance(0.3) ? feedbackSamples[between(0, 4)] : null;
        const when = stamp(addDays(plan.date, 1) > today ? today : addDays(plan.date, 1), "16:00");
        await q("INSERT INTO exam_results (exam_id, student_id, score, feedback, graded_at, graded_by) VALUES ($1,$2,$3,$4,$5,$6)", [exam.id, student.id, score, feedback, when, course.professorId]);
        notify(student.id, `Exam result: ${plan.title}`, `${course.code} · ${score}/${plan.points}${feedback ? ` · ${feedback}` : ""}`, "/grades", when, plan.results === "all");
      }
    }

    // A bulletin announcement per class
    const note = pair.groupName.endsWith("101") || pair.groupName.endsWith("M1");
    await q("INSERT INTO announcements (course_id, group_id, created_by, title, body, created_at) VALUES ($1,$2,$3,$4,$5,$6)", [course.id, pair.groupId, course.professorId, `${course.code}: ${note ? "Welcome to the course" : "Reading for next week"}`, note ? `Welcome to ${course.title}. The syllabus and the class plan are on the subject page; please read them before the next class.` : `Please read the chapter on "${course.topics[3] ?? course.topics[0]}" before the next class and bring your questions.`, stamp(addDays(today, -4), "11:00")]);
    notify(course.professorId, `${course.code}: ${note ? "Welcome to the course" : "Reading for next week"}`, `Group ${pair.groupName}`, "/bulletin", stamp(addDays(today, -4), "11:00"), true);
    for (const student of roster) notify(student.id, `${course.code}: ${note ? "Welcome to the course" : "Reading for next week"}`, `Group ${pair.groupName}`, "/bulletin", stamp(addDays(today, -4), "11:00"), chance(0.6));
  }

  // Class plan: weeks of lessons, each with slides and a reading link
  const lessonRows = [];
  for (const course of courses) {
    let topic = 0;
    for (let week = 1; week <= 6; week += 1) {
      for (let i = 0; i < course.perWeek; i += 1) {
        lessonRows.push({ course, week, position: i, topic: course.topics[topic % course.topics.length] + (topic >= course.topics.length ? " (review)" : i === 1 ? " — seminar" : "") });
        topic += 1;
      }
    }
  }
  const lessonIds = await insertMany("course_lessons", ["course_id", "week", "position", "topic"], lessonRows.map((l) => [l.course.id, l.week, l.position, l.topic]), "RETURNING id");
  const materialRows = [];
  for (const [index, lesson] of lessonRows.entries()) {
    const lessonId = lessonIds[index].id;
    const base = lesson.topic.replace(/ — seminar| \(review\)/g, "");
    if (lesson.position === 0 || chance(0.5)) {
      const file = await storeFile(`materials/${lesson.course.id}`, [`${lesson.course.code} · Week ${lesson.week}`, base, "Lecture slides (demo)."]);
      materialRows.push([lessonId, `Slides: ${base}`, null, `${lesson.course.code}-week${lesson.week}-${lesson.position + 1}.pdf`, file.path, "application/pdf", file.size]);
    }
    if (lesson.position === 1 || chance(0.4)) materialRows.push([lessonId, `Reading: ${base}`, `https://en.wikipedia.org/wiki/${encodeURIComponent(base.replace(/ /g, "_"))}`, null, null, null, null]);
    if (lesson.week <= 2 && lesson.position === 0) materialRows.push([lessonId, `Video lecture: ${base}`, `https://www.youtube.com/results?search_query=${encodeURIComponent(`${lesson.course.title} ${base}`)}`, null, null, null, null]);
  }
  await insertMany("lesson_materials", ["lesson_id", "title", "url", "file_name", "file_path", "file_type", "file_size"], materialRows);

  await insertMany("notifications", ["recipient_id", "title", "detail", "href", "read_at", "created_at"], notifications);
  await client.query("COMMIT");

  const counts = await q(`SELECT (SELECT count(*) FROM users WHERE role='professor') AS professors, (SELECT count(*) FROM users WHERE role='student') AS students, (SELECT count(*) FROM courses) AS courses,
    (SELECT count(*) FROM timetable_entries) AS classes, (SELECT count(*) FROM homework) AS homework, (SELECT count(*) FROM homework_submissions) AS submissions, (SELECT count(*) FROM exams) AS exams,
    (SELECT count(*) FROM exam_results) AS results, (SELECT count(*) FROM attendance_sessions) AS sessions, (SELECT count(*) FROM attendance_records) AS marks, (SELECT count(*) FROM notifications) AS notifications`);
  console.log("Demo university ready:", counts[0]);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
