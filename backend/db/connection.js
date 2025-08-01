const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

let pool;

const initializeDB = async () => {
  try {
    const connectionConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    
    // Only add password if it's not empty
    if (process.env.DB_PASSWORD) {
      connectionConfig.password = process.env.DB_PASSWORD;
    }
    
    console.log('Connecting to database with config:', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      database: connectionConfig.database,
      hasPassword: !!connectionConfig.password
    });
    
    pool = mysql.createPool(connectionConfig);

    await pool.getConnection();
    console.log('Database connected successfully');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
};

module.exports = { initializeDB, getDB };