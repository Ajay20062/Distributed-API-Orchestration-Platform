import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Killer@123",
  database: "api_orchestrator",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDB() {
  try {
    // Create workflows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        definition JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create executions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS executions (
        id VARCHAR(255) PRIMARY KEY,
        workflow_id VARCHAR(255),
        results JSON,
        success_count INT,
        failure_count INT,
        status VARCHAR(50),
        completed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initDB();
