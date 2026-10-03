// Creates a platform administrator, or resets an existing one's password.
//
//   npm run admin:create -- --email admin@example.kg --name "Full Name"
//
// The password is read from ADMIN_PASSWORD when set (for CI), otherwise it is
// prompted for without echoing. Nothing is stored in source control.
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";
import pg from "pg";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
const email = values.email?.trim().toLowerCase();
const fullName = values.name?.trim();

if (!email || !email.includes("@") || !fullName) {
  console.error('Usage: npm run admin:create -- --email admin@example.kg --name "Full Name"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    readline._writeToOutput = (text) => { if (text.includes(question)) process.stdout.write(text); };
    readline.question(question, (answer) => { readline.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) {
    console.error("Set ADMIN_PASSWORD or run this command in an interactive terminal.");
    process.exit(1);
  }
  password = await promptHidden("Password (min 8 characters): ");
  const confirmation = await promptHidden("Repeat password: ");
  if (password !== confirmation) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
}
if (password.length < 8) {
  console.error("The admin password must be at least 8 characters.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await client.query(
    `INSERT INTO users (university_id, role, email, full_name, password_hash)
     VALUES (NULL, 'admin', $1, $2, $3)
     ON CONFLICT (email) WHERE role = 'admin'
     DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, token_version = users.token_version + 1
     RETURNING (xmax = 0) AS created`,
    [email, fullName, passwordHash],
  );
  console.log(result.rows[0].created ? `Created platform admin ${email}.` : `Updated platform admin ${email} and signed out its existing sessions.`);
} finally {
  await client.end();
}
