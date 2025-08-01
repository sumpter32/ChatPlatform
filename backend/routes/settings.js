const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDB } = require('../db/connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const axios = require('axios');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'platform');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const type = req.body.type || 'file';
    const ext = path.extname(file.originalname);
    cb(null, `${type}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.get('/platform', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const [settings] = await db.execute('SELECT * FROM platform_settings');
    
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('Get platform settings error:', error);
    res.status(500).json({ message: 'Failed to fetch platform settings' });
  }
});

router.put('/platform', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await db.execute(
        'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, value, value]
      );
    }
    
    res.json({ message: 'Platform settings updated successfully' });
  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json({ message: 'Failed to update platform settings' });
  }
});

router.post('/platform/upload', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { type } = req.body;
    let processedPath = `/uploads/platform/${req.file.filename}`;
    
    if (type === 'logo' || type === 'favicon') {
      const size = type === 'favicon' ? 32 : 200;
      const outputPath = path.join(req.file.destination, `processed-${req.file.filename}`);
      
      await sharp(req.file.path)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFile(outputPath);
      
      processedPath = `/uploads/platform/processed-${req.file.filename}`;
      
      await fs.unlink(req.file.path);
    }
    
    const db = getDB();
    await db.execute(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [`${type}_url`, processedPath, processedPath]
    );
    
    res.json({ url: processedPath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

router.get('/wordpress', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const [settings] = await db.execute('SELECT * FROM wordpress_settings LIMIT 1');
    
    res.json({ settings: settings[0] || null });
  } catch (error) {
    console.error('Get WordPress settings error:', error);
    res.status(500).json({ message: 'Failed to fetch WordPress settings' });
  }
});

router.put('/wordpress', authenticate, requireAdmin, async (req, res) => {
  try {
    const { url, api_key } = req.body;
    const db = getDB();
    
    const [existing] = await db.execute('SELECT id FROM wordpress_settings LIMIT 1');
    
    if (existing.length > 0) {
      await db.execute(
        'UPDATE wordpress_settings SET url = ?, api_key = ? WHERE id = ?',
        [url, api_key, existing[0].id]
      );
    } else {
      await db.execute(
        'INSERT INTO wordpress_settings (url, api_key) VALUES (?, ?)',
        [url, api_key]
      );
    }
    
    res.json({ message: 'WordPress settings updated successfully' });
  } catch (error) {
    console.error('Update WordPress settings error:', error);
    res.status(500).json({ message: 'Failed to update WordPress settings' });
  }
});

router.post('/wordpress/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { url, api_key } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'WordPress URL is required' 
      });
    }

    // Clean up URL - ensure it ends without trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    console.log('Testing WordPress connection to:', cleanUrl);
    
    // Try different authentication methods
    let response;
    let authMethod = 'none';
    
    if (api_key) {
      // Method 1: Bearer token (for JWT or similar)
      try {
        const testUrl = new URL('/wp-json/wp/v2/users/me', cleanUrl).toString();
        console.log('Trying Bearer auth to:', testUrl);
        response = await axios.get(testUrl, { 
          headers: { Authorization: `Bearer ${api_key}` },
          timeout: 10000 
        });
        authMethod = 'bearer';
      } catch (bearerError) {
        console.log('Bearer auth failed:', bearerError.message);
        
        // Method 2: Basic auth (for application passwords)
        try {
          // Assume api_key is in format "username:password" or just password
          const [username, password] = api_key.includes(':') ? api_key.split(':') : ['admin', api_key];
          const testUrl = new URL('/wp-json/wp/v2/users/me', cleanUrl).toString();
          console.log('Trying Basic auth to:', testUrl, 'with username:', username);
          
          response = await axios.get(testUrl, {
            auth: { username, password },
            timeout: 10000
          });
          authMethod = 'basic';
        } catch (basicError) {
          console.log('Basic auth failed:', basicError.message);
          throw bearerError; // Return the original error
        }
      }
    } else {
      // Method 3: No auth (public API)
      const testUrl = new URL('/wp-json/wp/v2', cleanUrl).toString();
      console.log('Trying no auth to:', testUrl);
      response = await axios.get(testUrl, { timeout: 10000 });
      authMethod = 'public';
    }
    
    console.log('WordPress connection successful using:', authMethod);
    
    res.json({ 
      success: true, 
      message: `WordPress connection successful (${authMethod})`,
      user: response.data?.name || response.data?.description || 'Connected',
      authMethod
    });
  } catch (error) {
    console.error('WordPress connection error:', error.message);
    console.error('Error details:', {
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    let errorMessage = 'WordPress connection failed';
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'WordPress site not found. Check the URL.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Check if WordPress site is accessible.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Check if WordPress site is accessible.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed. Check your API key/credentials.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Access forbidden. Check API key permissions.';
    } else if (error.response?.status === 404) {
      errorMessage = 'WordPress REST API not found. Ensure REST API is enabled.';
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage,
      error: error.message,
      details: {
        code: error.code,
        status: error.response?.status,
        url: req.body.url
      }
    });
  }
});

// Get or generate ChatPlatform API key
router.get('/chatplatform-api-key', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const [settings] = await db.execute(
      'SELECT value FROM platform_settings WHERE `key` = ?',
      ['chatplatform_api_key']
    );
    
    let apiKey;
    if (settings.length === 0 || !settings[0].value) {
      // Generate a new API key
      const crypto = require('crypto');
      apiKey = 'cp_' + crypto.randomBytes(32).toString('hex');
      
      await db.execute(
        'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        ['chatplatform_api_key', apiKey, apiKey]
      );
    } else {
      apiKey = settings[0].value;
    }
    
    res.json({ api_key: apiKey });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ message: 'Failed to get API key' });
  }
});

// Generate new ChatPlatform API key
router.post('/chatplatform-api-key/generate', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const crypto = require('crypto');
    const apiKey = 'cp_' + crypto.randomBytes(32).toString('hex');
    
    await db.execute(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      ['chatplatform_api_key', apiKey, apiKey]
    );
    
    res.json({ api_key: apiKey });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ message: 'Failed to generate API key' });
  }
});

// Temporary image upload for social media sharing
const tempImageStorage = multer.memoryStorage();
const tempImageUpload = multer({
  storage: tempImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post('/share/upload-image', authenticate, tempImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Generate a unique filename
    const filename = `share-${crypto.randomUUID()}.png`;
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    const filePath = path.join(tempDir, filename);
    
    // Save the image
    await fs.writeFile(filePath, req.file.buffer);
    
    // Set up cleanup after 1 hour
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.log('Failed to clean up temp file:', filename);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    const imageUrl = `${req.protocol}://${req.get('host')}/api/settings/share/image/${filename}`;
    
    res.json({ 
      imageUrl,
      filename,
      expiresIn: '1 hour'
    });
  } catch (error) {
    console.error('Upload temp image error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// Serve temporary shared images
router.get('/share/image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (!/^share-[a-f0-9-]+\.png$/.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, '..', 'uploads', 'temp', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: 'Image not found or expired' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve temp image error:', error);
    res.status(500).json({ message: 'Failed to serve image' });
  }
});

module.exports = router;