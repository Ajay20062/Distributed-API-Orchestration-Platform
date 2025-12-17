import mysql from 'mysql2/promise';

async function initDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'kil',
    database: 'api_orchestrator'
  });

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS workflows (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      definition JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS executions (
      id VARCHAR(255) PRIMARY KEY,
      workflow_id VARCHAR(255),
      status VARCHAR(50),
      results JSON,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id)
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized');
  await connection.end();
}

initDB().catch(console.error);
