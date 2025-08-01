const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function checkDatabases() {
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Connected to MySQL server');

    // List all databases
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('\nAvailable databases:');
    databases.forEach(db => {
      console.log(`- ${db.Database}`);
    });

    // Check each database for our tables
    console.log('\nChecking for chatplatform tables:');
    for (const db of databases) {
      const dbName = db.Database;
      if (dbName === 'information_schema' || dbName === 'performance_schema' || dbName === 'mysql' || dbName === 'sys') {
        continue; // Skip system databases
      }

      const [tables] = await connection.execute(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'agents', 'chat_threads')`,
        [dbName]
      );

      if (tables.length > 0) {
        console.log(`\nFound tables in database '${dbName}':`);
        tables.forEach(table => {
          console.log(`  - ${table.TABLE_NAME}`);
        });
      }
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabases();