import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import Queue from "bull";
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Function to broadcast to all clients
const broadcast = (data) => {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
};

// Database connection
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Killer123",
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
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error("Error during login:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup endpoint
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if user already exists
    const [existingUser] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password (in production, use bcrypt)
    // For simplicity, storing plain text - NOT RECOMMENDED FOR PRODUCTION
    await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    logger.error("Error during signup:", error);
    res.status(500).json({ error: 'Internal server error' });
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

// Job processor
workflowQueue.process(async (job) => {
  const { workflow, executionId } = job.data;
  logger.info(`Processing workflow: ${executionId}`);

  try {
    const results = { stepResults: [], summary: { success: 0, failed: 0 } };

    for (const step of workflow.steps) {
      try {
        const response = await fetch(step.url, {
          method: step.method || 'GET',
          headers: step.headers || {},
          body: step.body ? JSON.stringify(step.body) : undefined
        });

        const data = await response.json();

        results.stepResults.push({
          stepId: step.stepId,
          status: response.ok ? 'success' : 'failed',
          statusCode: response.status,
          data: data
        });

        if (response.ok) {
          results.summary.success++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        logger.error(`Step ${step.stepId} failed:`, error);
        results.stepResults.push({
          stepId: step.stepId,
          status: 'failed',
          error: error.message
        });
        results.summary.failed++;
      }
    }

    // Store execution result
    await pool.execute(
      'INSERT INTO executions (id, workflow_name, status, results, completed_at) VALUES (?, ?, ?, ?, NOW())',
      [executionId, workflow.workflowName || 'Unnamed Workflow', 'completed', JSON.stringify(results)]
    );

    metrics.totalExecutions++;
    metrics.successfulExecutions += results.summary.failed === 0 ? 1 : 0;
    metrics.failedExecutions += results.summary.failed > 0 ? 1 : 0;

    // Broadcast update to all connected clients
    broadcast({
      type: 'workflow_completed',
      executionId,
      status: 'completed',
      results,
      metrics
    });

    logger.info(`Workflow ${executionId} completed successfully`);
  } catch (error) {
    logger.error(`Workflow ${executionId} failed:`, error);

    // Store failed execution
    await pool.execute(
      'INSERT INTO executions (id, workflow_name, status, results, completed_at) VALUES (?, ?, ?, ?, NOW())',
      [executionId, workflow.workflowName || 'Unnamed Workflow', 'failed', JSON.stringify({ error: error.message }), null]
    );

    metrics.totalExecutions++;
    metrics.failedExecutions++;

    // Broadcast update to all connected clients
    broadcast({
      type: 'workflow_failed',
      executionId,
      status: 'failed',
      error: error.message,
      metrics
    });

    throw error; // Re-throw for BullMQ retry
  }
});

// Routes for pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

server.listen(5000, () => console.log("Server running on port 5000"));
