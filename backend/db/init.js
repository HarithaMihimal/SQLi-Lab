const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "sqli_lab";

const seedUsers = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "alice", password: "password123", role: "student" },
  { username: "bob", password: "letmein", role: "student" },
];

const seedProfiles = [
  {
    username: "admin",
    fullName: "System Administrator",
    email: "admin@sqli-lab.local",
    bio: "Manages the SQLi Lab training environment.",
    secretNote: "FLAG{parameterized_queries_prevent_sqli}",
  },
  {
    username: "alice",
    fullName: "Alice Johnson",
    email: "alice@example.edu",
    bio: "Computer science student interested in web security.",
    secretNote: "Internal note: rotate student demo passwords each semester.",
  },
  {
    username: "bob",
    fullName: "Bob Smith",
    email: "bob@example.edu",
    bio: "TA assistant for secure coding workshops.",
    secretNote: "Internal note: review lab submissions before publishing.",
  },
];

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${DB_NAME}\``);

    await connection.query("DROP TABLE IF EXISTS profiles");
    await connection.query("DROP TABLE IF EXISTS users");

    await connection.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL,
        bio TEXT,
        secret_note VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await connection.execute(
        "INSERT INTO users (username, password, password_hash, role) VALUES (?, ?, ?, ?)",
        [user.username, user.password, passwordHash, user.role]
      );
    }

    for (const profile of seedProfiles) {
      const [rows] = await connection.execute(
        "SELECT id FROM users WHERE username = ? LIMIT 1",
        [profile.username]
      );
      const userId = rows[0].id;
      await connection.execute(
        "INSERT INTO profiles (user_id, full_name, email, bio, secret_note) VALUES (?, ?, ?, ?, ?)",
        [userId, profile.fullName, profile.email, profile.bio, profile.secretNote]
      );
    }

    console.log(`[db:init] Database '${DB_NAME}' initialized successfully.`);
    console.log("[db:init] Seed users created:");
    for (const user of seedUsers) {
      console.log(`  - ${user.username} / ${user.password} (${user.role})`);
    }
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch((error) => {
  console.error("[db:init] Failed to initialize database:", error.message);
  process.exitCode = 1;
});
