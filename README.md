# SQLi-Lab

A professional, local-only learning lab for demonstrating **SQL injection vulnerabilities** and **secure remediation techniques**.

SQLi-Lab provides side-by-side vulnerable and secure API endpoints, a browser-based demo UI, seeded demo data, and instructor-friendly documentation for classroom walkthroughs.

> **Safety notice:** This project intentionally contains vulnerable endpoints for education. Run it only in an isolated local environment. Do **not** deploy the vulnerable lab to the public internet or connect it to production data.

## Learning Objectives

By the end of this lab, students should be able to:

- Explain what SQL injection is and why it happens.
- Identify unsafe query construction patterns in backend code.
- Demonstrate common SQLi payloads in a controlled environment.
- Apply secure defenses: parameterized queries, input validation, least data exposure, and password hashing.
- Verify fixes by comparing vulnerable and secure behavior.

## Lab Scenarios

| Lab | Vulnerable behavior | Secure behavior | Sample payload |
|---|---|---|---|
| **Authentication Bypass** | Login query built with string concatenation | Parameterized lookup + bcrypt password verification | `admin' OR '1'='1' -- ` |
| **Search Data Exposure** | Search term interpolated into `LIKE` query | Parameterized `LIKE` query with bounded input | `' UNION SELECT u.id, u.username, u.password, u.role, p.email, p.secret_note FROM users u JOIN profiles p ON u.id = p.user_id -- ` |
| **Profile Lookup by ID** | ID concatenated directly into SQL | Integer validation + parameterized query + limited fields | `1 OR 1=1` |

## Project Structure

```text
SQLi-Lab/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool and health check
│   ├── db/
│   │   └── init.js               # Creates schema and seeds demo data
│   ├── public/
│   │   ├── app.js                # Frontend demo logic
│   │   ├── index.html            # Demo UI
│   │   └── styles.css            # UI styling
│   ├── routes/
│   │   └── labRoutes.js          # Vulnerable and secure lab endpoints
│   ├── .env.example              # Environment variable template
│   ├── package.json
│   └── server.js                 # Express app bootstrap
├── postman/
│   └── collections/
│       └── SQLi-Lab.postman_collection.json
├── .gitignore
├── LICENSE
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20+ recommended)
- [MySQL](https://dev.mysql.com/downloads/) 8+ or compatible MariaDB
- npm

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/HarithaMihimal/SQLi-Lab.git
cd SQLi-Lab/backend
npm install
```

### 2. Configure environment

Create `backend/.env` from the example:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

Update the values as needed:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=sqli_lab
```

### 3. Initialize the database

```bash
npm run db:init
```

This creates the `sqli_lab` database, recreates demo tables, and seeds users/profiles.

### 4. Start the lab

```bash
npm run dev
# or
npm start
```

Open [http://localhost:5000](http://localhost:5000).

## Demo Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `alice` | `password123` | student |
| `bob` | `letmein` | student |

## Instructor Demo Walkthrough

### 1) Authentication Bypass

- Open the **Authentication Bypass** lab in vulnerable mode.
- Run normal credentials: `admin / admin123`.
- Run payload: username `admin' OR '1'='1' -- ` with any password.
- Discuss why the query returns rows even without a valid password.
- Switch to secure mode and rerun the payload. The parameterized lookup and bcrypt verification reject it.

### 2) Search Data Exposure

- Open **Search Data Exposure**.
- Start with a normal search like `alice`.
- Run the UNION payload from the sample button.
- Observe how the vulnerable query can expose data outside the intended result shape.
- Switch to secure mode and show that the same input is treated as data.

### 3) Profile Lookup by ID

- Open **Profile Lookup by ID**.
- Request `id=1`, then try `1 OR 1=1`.
- Show the vulnerable endpoint returning extra rows/sensitive fields.
- Switch to secure mode: invalid IDs are rejected, and only safe fields are returned.

## API Reference

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and DB connectivity status |
| `GET` | `/api/labs` | Lab metadata and sample payloads |
| `POST` | `/api/labs/auth-bypass/vulnerable` | Vulnerable login query |
| `POST` | `/api/labs/auth-bypass/secure` | Secure login query |
| `GET` | `/api/labs/search/vulnerable?q=` | Vulnerable search query |
| `GET` | `/api/labs/search/secure?q=` | Secure search query |
| `GET` | `/api/labs/profile/vulnerable?id=` | Vulnerable profile lookup |
| `GET` | `/api/labs/profile/secure?id=` | Secure profile lookup |

Legacy compatibility endpoints are also available:

- `POST /login-vulnerable`
- `POST /login-secure`

## Secure Coding Takeaways

- **Parameterize queries**: Never concatenate untrusted input into SQL.
- **Validate input**: Enforce expected types, formats, and lengths.
- **Hash passwords**: Store password hashes (bcrypt/argon2), never plaintext.
- **Limit data exposure**: Return only fields required by the use case.
- **Handle errors safely**: Avoid leaking internal details in production.
- **Defense in depth**: Combine query parameterization, validation, least privilege DB users, logging, and WAF/rate limiting where appropriate.

## Development Notes

- The vulnerable endpoints intentionally expose executed query details for learning. Do not reuse this pattern in real applications.
- `backend/.env` is ignored by git; commit only `.env.example`.
- `npm run db:init` drops and recreates lab tables, then reseeds demo data. Run it whenever you want a clean lab state.
- For teaching clarity, the seed data includes a plaintext `password` column used by the vulnerable auth demo and a `password_hash` column used by the secure demo. Real applications must never store plaintext passwords.

## Troubleshooting

- **Database connection fails**: Confirm MySQL is running, credentials in `backend/.env` are correct, and the configured user can create databases/tables.
- **Port already in use**: Change `PORT` in `backend/.env`.
- **Seed/reset needed**: Run `npm run db:init` from the `backend` directory.
- **UI loads but API errors**: Check the server console for DB errors and verify `/api/health` returns `"database": "connected"`.

## Postman

Import [postman/collections/SQLi-Lab.postman_collection.json](postman/collections/SQLi-Lab.postman_collection.json) into Postman to run the API demos without the browser UI.

## License

This project is licensed under the [MIT License](LICENSE).
