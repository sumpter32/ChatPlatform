const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const { getInstallationStatus, setInstallationStatus } = require('../utils/installationStatus');

router.post('/test-connection', async (req, res) => {
  const { host, port, user, password, database } = req.body;

  try {
    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      user,
      password,
      database
    });

    await connection.ping();
    await connection.end();

    res.json({ success: true, message: 'Database connection successful' });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Database connection failed', 
      error: error.message 
    });
  }
});

router.post('/setup', async (req, res) => {
  const { 
    dbConfig, 
    adminUser,
    jwtSecret = require('crypto').randomBytes(32).toString('hex')
  } = req.body;

  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port || 3306,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });

    const sqlPath = path.join(__dirname, '..', '..', 'sql', '001_create_tables.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    await connection.query(sql);

    if (adminUser) {
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [adminUser.name, adminUser.email, hashedPassword, 'admin']
      );
    }

    await connection.execute(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      ['site_name', 'AI Chat Platform', 'AI Chat Platform']
    );

    // Insert a default model
    const [modelResult] = await connection.execute(
      'INSERT INTO models (name, provider, description, enabled) VALUES (?, ?, ?, ?)',
      ['gpt-3.5-turbo', 'OpenAI', 'Default GPT-3.5 model', true]
    );

    // Insert a default agent
    await connection.execute(
      `INSERT INTO agents (name, greeting, prompt_template, model_id, response_style, active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Assistant',
        'Hello! I\'m your AI assistant. How can I help you today?',
        'You are a helpful AI assistant. Respond to the user\'s message: {user_message}',
        modelResult.insertId,
        'direct',
        true
      ]
    );

    await connection.end();

    const envContent = `# Backend Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=${dbConfig.host}
DB_PORT=${dbConfig.port || 3306}
DB_USER=${dbConfig.user}
DB_PASSWORD=${dbConfig.password}
DB_NAME=${dbConfig.database}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# Open WebUI Configuration
OPEN_WEBUI_BASE_URL=http://localhost:8080
OPEN_WEBUI_API_KEY=

# CORS Configuration
FRONTEND_URL=http://localhost:5173`;

    const envPath = path.join(__dirname, '..', '..', '.env');
    await fs.writeFile(envPath, envContent);

    // Update the global installation status
    setInstallationStatus(true);
    console.log('Installation completed - setting global status to INSTALLED');

    res.json({ 
      success: true, 
      message: 'Installation completed successfully',
      adminCreated: !!adminUser
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Installation failed', 
      error: error.message 
    });
  }
});

router.get('/check', async (req, res) => {
  // Set headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    // Use the global installation status that was set at server startup
    let isInstalled = getInstallationStatus();
    
    console.log(`Installation check from ${req.get('User-Agent')} - Status: ${isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}`);
    
    res.json({ 
      installed: isInstalled,
      debug: {
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        host: req.get('Host'),
        origin: req.get('Origin')
      }
    });
  } catch (error) {
    console.log('Installation check failed:', error.message);
    res.json({ 
      installed: false, 
      reason: error.message,
      debug: {
        userAgent: req.get('User-Agent'),
        host: req.get('Host'),
        origin: req.get('Origin')
      }
    });
  }
});

// Debug endpoint to help troubleshoot installation issues
router.get('/debug', async (req, res) => {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envExists = false;
    try {
      await fs.access(envPath);
      envExists = true;
    } catch (e) {
      envExists = false;
    }
    
    // Reload environment variables
    if (envExists) {
      require('dotenv').config({ path: envPath });
    }
    
    res.json({
      envFile: {
        exists: envExists,
        path: envPath
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbName: !!process.env.DB_NAME,
        hasDbPassword: !!process.env.DB_PASSWORD,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME
      },
      request: {
        userAgent: req.get('User-Agent'),
        host: req.get('Host'),
        origin: req.get('Origin'),
        headers: req.headers
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;