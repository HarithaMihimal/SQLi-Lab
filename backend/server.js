const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const { verifyConnection } = require("./config/db");
const labRoutes = require("./routes/labRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (_req, res) => {
  try {
    await verifyConnection();
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      message: error.message,
    });
  }
});

app.use("/api", labRoutes);

// Legacy endpoints kept for compatibility with the original lab.
app.post("/login-vulnerable", (req, res, next) => {
  req.url = "/labs/auth-bypass/vulnerable";
  labRoutes(req, res, next);
});

app.post("/login-secure", (req, res, next) => {
  req.url = "/labs/auth-bypass/secure";
  labRoutes(req, res, next);
});

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error("[server] Unhandled error:", error);
  res.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  try {
    await verifyConnection();
    console.log("[db] Connection verified.");
  } catch (error) {
    console.warn(
      "[db] Could not connect at startup. The API will start, but database-backed labs will fail until MySQL is configured."
    );
    console.warn(`[db] ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`[server] SQLi Lab running at http://localhost:${PORT}`);
  });
}

startServer();
