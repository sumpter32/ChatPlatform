const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initializeDB } = require('./db/connection');
const { getInstallationStatus, setInstallationStatus } = require('./utils/installationStatus');

// Function to check installation status
const checkInstallationStatus = async () => {
  try {
    const fs = require('fs').promises;
    const mysql = require('mysql2/promise');
    const envPath = path.join(__dirname, '..', '.env');
    
    console.log('Checking installation status...');
    console.log('ENV path:', envPath);
    
    // Check if .env file exists
    await fs.access(envPath);
    console.log('✓ .env file exists');
    
    // Load environment variables
    require('dotenv').config({ path: envPath });
    console.log('Database config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      hasPassword: !!process.env.DB_PASSWORD
    });
    
    // Check if we have database config
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      console.log('✗ Missing database configuration');
      return false;
    }
    console.log('✓ Database configuration present');
    
    // Test database connection and check for required tables
    const connectionConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    };
    
    if (process.env.DB_PASSWORD) {
      connectionConfig.password = process.env.DB_PASSWORD;
    }
    
    console.log('Testing database connection...');
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Database connection successful');
    
    // Check if required tables exist
    console.log('Checking for required tables...');
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME as table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'agents', 'models', 'platform_settings')",
      [process.env.DB_NAME]
    );
    
    console.log('Found tables:', tables.map(t => t.table_name));
    
    await connection.end();
    
    const hasAllTables = tables.length >= 4;
    console.log(`✓ Installation check result: ${hasAllTables ? 'INSTALLED' : 'NOT INSTALLED'} (${tables.length}/4 tables)`);
    
    return hasAllTables;
  } catch (error) {
    console.log('✗ Installation check failed:', error.message);
    console.log('Error details:', error);
    return false;
  }
};


const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Cloudflare
app.set('trust proxy', true);

// Configure CORS to support production domains
const allowedOrigins = [
  'https://chat.wwjs.app', // Production domain
  'https://www.chat.wwjs.app', // www version
  process.env.FRONTEND_URL, // Environment variable override
  // Only include localhost in development
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:5173',
    'http://localhost:3000'
  ] : [])
].filter(Boolean); // Remove any undefined values

// Secure CORS configuration for production
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS check - Origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('CORS: Allowing origin:', origin);
      return callback(null, true);
    }
    
    // Reject unknown origins in production
    if (process.env.NODE_ENV === 'production') {
      console.log('CORS: Blocking origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Allow all origins in development
    console.log('CORS: Allowing origin (dev mode):', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const installRoutes = require('./routes/install');
app.use('/api/install', installRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    installed: getInstallationStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug', (req, res) => {
  const allRoutes = [];
  
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Direct routes
      allRoutes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          allRoutes.push({
            method: Object.keys(handler.route.methods)[0].toUpperCase(),
            path: (middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/') + handler.route.path).replace('//', '/')
          });
        }
      });
    }
  });

  res.json({
    installation: {
      status: getInstallationStatus(),
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        PORT: process.env.PORT
      }
    },
    routes: allRoutes,
    routeCount: allRoutes.length
  });
});

const startServer = async () => {
  try {
    // Check installation status at startup
    const isInstalled = await checkInstallationStatus();
    setInstallationStatus(isInstalled);
    
    if (isInstalled) {
      try {
        await initializeDB();
        console.log('Database initialized successfully');
        
        const authRoutes = require('./routes/auth');
        const wordpressAuthRoutes = require('./routes/wordpress-auth');
        const agentsRoutes = require('./routes/agents');
        const modelsRoutes = require('./routes/models');
        const settingsRoutes = require('./routes/settings');
        const chatRoutes = require('./routes/chat');
        
        app.use('/api/auth', authRoutes);
        app.use('/api/wordpress-auth', wordpressAuthRoutes);
        app.use('/api/agents', agentsRoutes);  
        app.use('/api/models', modelsRoutes);
        app.use('/api/settings', settingsRoutes);
        app.use('/api/chat', chatRoutes);
        
        console.log('✓ All application routes loaded successfully');
        console.log('✓ Routes available: /api/auth, /api/agents, /api/models, /api/settings, /api/chat');
        console.log('✓ CORS configured for origins:', allowedOrigins);
        console.log('✓ Environment:', process.env.NODE_ENV);
      } catch (error) {
        console.log('Error during initialization:', error.message);
        console.log('Setting installation status to false');
        setInstallationStatus(false);
      }
    } else {
      console.log('Platform not installed yet - only install endpoints available');
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    setInstallationStatus(false);
  }
};

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const start = async () => {
  await startServer();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server accessible at:`);
    console.log(`  - Local: http://localhost:${PORT}`);
    console.log(`  - Network: http://[your-ip]:${PORT}`);
    console.log(`Installation status: ${getInstallationStatus() ? 'INSTALLED' : 'NOT INSTALLED'}`);
  });
};

start();

