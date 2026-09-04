import { DatabaseSync } from "node:sqlite";
import { hashSync } from "bcryptjs";

const database = new DatabaseSync("data/tronsabak.sqlite");
const university = database.prepare("SELECT id FROM universities WHERE name = ?").get("Ala-Too International University");
if (!university) throw new Error("Initialize the app before creating an admin account.");

database.prepare("INSERT OR IGNORE INTO users (university_id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')").run(university.id, "admin@tronsabak.dev", "UniCore Administrator", hashSync("Professor123!", 12));
database.prepare("UPDATE users SET password_hash = ? WHERE university_id = ? AND role = 'admin'").run(hashSync("Professor123!", 12), university.id);
console.log("Admin account ready with the shared demo credentials.");
