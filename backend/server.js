const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const Queue = require("bull");
const winston = require("winston");
const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "api_orchestrator",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Queue setup
const workflowQueue = new Queue("workflow-execution", {
  redis: { host: "127.0.0.1", port: 6379 },
});

// Metrics
let metrics = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
};

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  // Simple authentication - in production, use proper user database
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post("/api/workflows/execute", authenticateToken, async (req, res) => {
  try {
    const workflow = req.body;
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      return res.status(400).json({ error: "Invalid workflow: steps must be an array" });
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store workflow in DB
    await pool.execute(
      'INSERT INTO workflows (id, name, definition, created_at) VALUES (?, ?, ?, NOW())',
      [executionId, workflow.workflowName || 'Unnamed Workflow', JSON.stringify(workflow)]
    );

    // Add to queue
    const job = await workflowQueue.add({ workflow, executionId }, { attempts: 3, backoff: 5000 });

    logger.info(`Workflow queued: ${executionId}`);
    res.json({ executionId, status: 'queued', jobId: job.id });
  } catch (error) {
    logger.error("Error queuing workflow:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get execution status
app.get("/api/workflows/execution/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM executions WHERE id = ?', [id]);
    const result = { rows };
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Execution not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error fetching execution:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get workflow history
app.get("/api/workflows/history", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM executions ORDER BY completed_at DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    logger.error("Error fetching history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Metrics endpoint
app.get("/api/metrics", authenticateToken, (req, res) => {
  res.json(metrics);
});

app.listen(5000, () => console.log("Server running on port 5000"));
