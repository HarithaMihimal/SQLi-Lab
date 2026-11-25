const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

const router = express.Router();

const LABS = [
  {
    id: "auth-bypass",
    title: "Authentication Bypass",
    summary:
      "Demonstrates how string-concatenated SQL in login queries allows authentication bypass.",
    vulnerableEndpoint: "/api/labs/auth-bypass/vulnerable",
    secureEndpoint: "/api/labs/auth-bypass/secure",
    samplePayload: {
      username: "admin' OR '1'='1' -- ",
      password: "anything",
    },
  },
  {
    id: "search",
    title: "Search Data Exposure",
    summary:
      "Demonstrates how unsafe search filters can be manipulated to expose unintended records.",
    vulnerableEndpoint: "/api/labs/search/vulnerable?q=alice",
    secureEndpoint: "/api/labs/search/secure?q=alice",
    samplePayload: {
      q: "' UNION SELECT u.id, u.username, u.password, u.role, p.email, p.secret_note FROM users u JOIN profiles p ON u.id = p.user_id -- ",
    },
  },
  {
    id: "profile-lookup",
    title: "Profile Lookup by ID",
    summary:
      "Demonstrates how unsafe numeric input handling can expose records or cause unintended behavior.",
    vulnerableEndpoint: "/api/labs/profile/vulnerable?id=1",
    secureEndpoint: "/api/labs/profile/secure?id=1",
    samplePayload: {
      id: "1 OR 1=1",
    },
  },
];

function getErrorMessage(error) {
  if (process.env.NODE_ENV === "production") {
    return "An unexpected error occurred.";
  }
  return error.message;
}

router.get("/labs", (_req, res) => {
  res.json({
    labs: LABS,
    disclaimer:
      "For educational use only. Run this lab in a local, isolated environment.",
  });
});

router.post("/labs/auth-bypass/vulnerable", async (req, res) => {
  const username = String(req.body?.username ?? "");
  const password = String(req.body?.password ?? "");

  const query =
    "SELECT id, username, role FROM users WHERE username = '" +
    username +
    "' AND password = '" +
    password +
    "'";

  try {
    const [rows] = await pool.query(query);
    res.json({
      lab: "auth-bypass",
      mode: "vulnerable",
      executedQuery: query,
      success: rows.length > 0,
      message:
        rows.length > 0
          ? "Login succeeded. The vulnerable query accepted the supplied input."
          : "Login failed.",
      data: rows,
      learningNote:
        "User input was concatenated directly into SQL. An attacker can alter query logic.",
    });
  } catch (error) {
    res.status(500).json({
      lab: "auth-bypass",
      mode: "vulnerable",
      executedQuery: query,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

router.post("/labs/auth-bypass/secure", async (req, res) => {
  const username = String(req.body?.username ?? "");
  const password = String(req.body?.password ?? "");
  const queryTemplate =
    "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1";

  try {
    const [rows] = await pool.execute(queryTemplate, [username]);
    if (rows.length === 0) {
      return res.status(401).json({
        lab: "auth-bypass",
        mode: "secure",
        queryTemplate,
        parameters: [username, "[redacted password]"],
        success: false,
        message: "Invalid credentials.",
      });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({
        lab: "auth-bypass",
        mode: "secure",
        queryTemplate,
        parameters: [username, "[redacted password]"],
        success: false,
        message: "Invalid credentials.",
      });
    }

    return res.json({
      lab: "auth-bypass",
      mode: "secure",
      queryTemplate,
      parameters: [username, "[redacted password]"],
      success: true,
      message: "Login succeeded through parameterized query and password verification.",
      data: [{ id: user.id, username: user.username, role: user.role }],
      learningNote:
        "Parameterized queries keep user input as data. Passwords are verified with bcrypt hashes.",
    });
  } catch (error) {
    return res.status(500).json({
      lab: "auth-bypass",
      mode: "secure",
      queryTemplate,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

router.get("/labs/search/vulnerable", async (req, res) => {
  const q = String(req.query.q ?? "");
  const query =
    "SELECT u.id, u.username, u.role, p.full_name, p.email, p.bio " +
    "FROM users u JOIN profiles p ON u.id = p.user_id " +
    "WHERE u.username LIKE '%" +
    q +
    "%' OR p.full_name LIKE '%" +
    q +
    "%'";

  try {
    const [rows] = await pool.query(query);
    res.json({
      lab: "search",
      mode: "vulnerable",
      executedQuery: query,
      success: true,
      count: rows.length,
      data: rows,
      learningNote:
        "Unsafe string interpolation in search filters can allow UNION-based data exposure.",
    });
  } catch (error) {
    res.status(500).json({
      lab: "search",
      mode: "vulnerable",
      executedQuery: query,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

router.get("/labs/search/secure", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 50);
  const queryTemplate =
    "SELECT u.id, u.username, u.role, p.full_name, p.email, p.bio " +
    "FROM users u JOIN profiles p ON u.id = p.user_id " +
    "WHERE u.username LIKE ? OR p.full_name LIKE ? " +
    "ORDER BY u.id LIMIT 20";
  const likeValue = `%${q}%`;

  try {
    const [rows] = await pool.execute(queryTemplate, [likeValue, likeValue]);
    res.json({
      lab: "search",
      mode: "secure",
      queryTemplate,
      parameters: [likeValue, likeValue],
      success: true,
      count: rows.length,
      data: rows,
      learningNote:
        "The search term is treated as data, and the query shape cannot be changed by user input.",
    });
  } catch (error) {
    res.status(500).json({
      lab: "search",
      mode: "secure",
      queryTemplate,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

router.get("/labs/profile/vulnerable", async (req, res) => {
  const id = String(req.query.id ?? "");
  const query =
    "SELECT u.id, u.username, u.role, p.full_name, p.email, p.bio, p.secret_note " +
    "FROM users u JOIN profiles p ON u.id = p.user_id " +
    "WHERE u.id = " +
    id;

  try {
    const [rows] = await pool.query(query);
    res.json({
      lab: "profile-lookup",
      mode: "vulnerable",
      executedQuery: query,
      success: true,
      count: rows.length,
      data: rows,
      learningNote:
        "Unvalidated ID input can change query logic and return records the user should not see.",
    });
  } catch (error) {
    res.status(500).json({
      lab: "profile-lookup",
      mode: "vulnerable",
      executedQuery: query,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

router.get("/labs/profile/secure", async (req, res) => {
  const rawId = String(req.query.id ?? "");
  const id = Number.parseInt(rawId, 10);
  const queryTemplate =
    "SELECT u.id, u.username, u.role, p.full_name, p.email, p.bio " +
    "FROM users u JOIN profiles p ON u.id = p.user_id " +
    "WHERE u.id = ? LIMIT 1";

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      lab: "profile-lookup",
      mode: "secure",
      queryTemplate,
      parameters: [rawId],
      success: false,
      message: "Invalid id. Expected a positive integer.",
      learningNote: "Input validation rejects unexpected data before it reaches the database.",
    });
  }

  try {
    const [rows] = await pool.execute(queryTemplate, [id]);
    return res.json({
      lab: "profile-lookup",
      mode: "secure",
      queryTemplate,
      parameters: [id],
      success: true,
      count: rows.length,
      data: rows,
      learningNote:
        "Validation and parameterization ensure the ID is handled as a number, not executable SQL.",
    });
  } catch (error) {
    return res.status(500).json({
      lab: "profile-lookup",
      mode: "secure",
      queryTemplate,
      success: false,
      message: "Query execution failed.",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;
