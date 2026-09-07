import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database(process.env.DB_PATH ?? "data.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function createUser(email: string, password: string) {
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, hash);
  return { id: info.lastInsertRowid, email };
}

export function getUser(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export default db;
