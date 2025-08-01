const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDB } = require('../db/connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'agents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('File filter - File type:', file.mimetype);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Multer error handler middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  } else if (error) {
    console.error('Upload error:', error);
    return res.status(400).json({ message: error.message });
  }
  next();
};

router.get('/', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const [agents] = await db.execute(`
      SELECT a.*, m.name as model_name
      FROM agents a
      LEFT JOIN models m ON a.model_id = m.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Failed to fetch agents' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const [agents] = await db.execute(`
      SELECT a.*, m.name as model_name
      FROM agents a
      LEFT JOIN models m ON a.model_id = m.id
      WHERE a.id = ?
    `, [req.params.id]);
    
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json({ agent: agents[0] });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ message: 'Failed to fetch agent' });
  }
});

router.post('/', authenticate, requireAdmin, upload.single('icon'), handleMulterError, async (req, res) => {
  try {
    console.log('Create agent request body:', req.body);
    console.log('File:', req.file);
    
    const {
      name,
      greeting,
      prompt_template,
      model_id,
      max_tokens = 2048,
      temperature = 0.7,
      vision_enabled = false,
      has_pre_prompt = false,
      response_style = 'direct',
      active = true
    } = req.body;
    
    // Convert string values to proper types
    const parsedData = {
      name,
      greeting,
      prompt_template,
      model_id: parseInt(model_id),
      max_tokens: parseInt(max_tokens) || 2048,
      temperature: parseFloat(temperature) || 0.7,
      vision_enabled: vision_enabled === 'true' || vision_enabled === true,
      has_pre_prompt: has_pre_prompt === 'true' || has_pre_prompt === true,
      response_style: response_style || 'direct',
      active: active === 'true' || active === true || active === undefined
    };
    
    let iconUrl = null;
    
    if (req.file) {
      const filename = req.file.filename;
      const outputPath = path.join(req.file.destination, 'thumb-' + filename);
      
      await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .toFile(outputPath);
      
      iconUrl = `/uploads/agents/thumb-${filename}`;
    }
    
    const db = getDB();
    const [result] = await db.execute(`
      INSERT INTO agents (
        name, icon_url, greeting, prompt_template, model_id,
        max_tokens, temperature, vision_enabled, has_pre_prompt,
        response_style, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parsedData.name, 
      iconUrl, 
      parsedData.greeting, 
      parsedData.prompt_template, 
      parsedData.model_id,
      parsedData.max_tokens, 
      parsedData.temperature, 
      parsedData.vision_enabled, 
      parsedData.has_pre_prompt,
      parsedData.response_style, 
      parsedData.active
    ]);
    
    res.json({
      message: 'Agent created successfully',
      agentId: result.insertId
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: 'Failed to create agent' });
  }
});

router.put('/:id', authenticate, requireAdmin, upload.single('icon'), handleMulterError, async (req, res) => {
  try {
    console.log('Update agent request body:', req.body);
    console.log('Update agent file:', req.file);
    console.log('Agent ID:', req.params.id);
    
    const {
      name,
      greeting,
      prompt_template,
      model_id,
      max_tokens = 2048,
      temperature = 0.7,
      vision_enabled = false,
      has_pre_prompt = false,
      response_style = 'direct',
      active = true
    } = req.body;
    
    // Convert string values to proper types (same as create)
    const parsedData = {
      name,
      greeting,
      prompt_template,
      model_id: parseInt(model_id),
      max_tokens: parseInt(max_tokens) || 2048,
      temperature: parseFloat(temperature) || 0.7,
      vision_enabled: vision_enabled === 'true' || vision_enabled === true,
      has_pre_prompt: has_pre_prompt === 'true' || has_pre_prompt === true,
      response_style: response_style || 'direct',
      active: active === 'true' || active === true || active === undefined
    };
    
    console.log('Parsed data:', parsedData);
    
    // Validate required fields
    if (!parsedData.name || !parsedData.model_id) {
      return res.status(400).json({ message: 'Name and model are required fields' });
    }
    
    const db = getDB();
    
    // Verify model exists
    const [models] = await db.execute('SELECT id FROM models WHERE id = ?', [parsedData.model_id]);
    if (models.length === 0) {
      return res.status(400).json({ message: 'Invalid model selected' });
    }
    
    const [agents] = await db.execute('SELECT icon_url FROM agents WHERE id = ?', [req.params.id]);
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    let iconUrl = agents[0].icon_url;
    
    if (req.file) {
      console.log('Processing uploaded file...');
      const filename = req.file.filename;
      const outputPath = path.join(req.file.destination, 'thumb-' + filename);
      
      await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .toFile(outputPath);
      
      iconUrl = `/uploads/agents/thumb-${filename}`;
      console.log('New icon URL:', iconUrl);
      
      // Clean up old icon files (don't let this fail the update)
      if (agents[0].icon_url) {
        const oldIconUrl = agents[0].icon_url;
        console.log('Cleaning up old icon:', oldIconUrl);
        
        // Schedule cleanup after response is sent
        process.nextTick(async () => {
          try {
            const oldPath = path.join(__dirname, '..', oldIconUrl);
            await fs.access(oldPath); // Check if file exists
            await fs.unlink(oldPath);
            console.log('Deleted old thumbnail:', oldPath);
            
            // Try to delete original file too
            const originalPath = oldPath.replace('thumb-', '');
            try {
              await fs.access(originalPath);
              await fs.unlink(originalPath);
              console.log('Deleted old original:', originalPath);
            } catch (origError) {
              console.log('Original file not found or already deleted:', originalPath);
            }
          } catch (error) {
            console.error('Failed to delete old icon files:', error.message);
          }
        });
      }
    }
    
    console.log('Updating database with icon URL:', iconUrl);
    
    await db.execute(`
      UPDATE agents SET
        name = ?, icon_url = ?, greeting = ?, prompt_template = ?,
        model_id = ?, max_tokens = ?, temperature = ?, vision_enabled = ?,
        has_pre_prompt = ?, response_style = ?, active = ?
      WHERE id = ?
    `, [
      parsedData.name, 
      iconUrl, 
      parsedData.greeting, 
      parsedData.prompt_template, 
      parsedData.model_id,
      parsedData.max_tokens, 
      parsedData.temperature, 
      parsedData.vision_enabled, 
      parsedData.has_pre_prompt,
      parsedData.response_style, 
      parsedData.active, 
      req.params.id
    ]);
    
    console.log('Agent updated successfully');
    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Update agent error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to update agent',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    
    const [agents] = await db.execute('SELECT icon_url FROM agents WHERE id = ?', [req.params.id]);
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    await db.execute('DELETE FROM agents WHERE id = ?', [req.params.id]);
    
    if (agents[0].icon_url) {
      const iconPath = path.join(__dirname, '..', agents[0].icon_url);
      try {
        await fs.unlink(iconPath);
        await fs.unlink(iconPath.replace('thumb-', ''));
      } catch (error) {
        console.error('Failed to delete icon:', error);
      }
    }
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ message: 'Failed to delete agent' });
  }
});

// Set default agent
router.put('/:id/set-default', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const agentId = req.params.id;
    
    // Verify agent exists and is active
    const [agents] = await db.execute('SELECT id, active FROM agents WHERE id = ?', [agentId]);
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    if (!agents[0].active) {
      return res.status(400).json({ message: 'Cannot set inactive agent as default' });
    }
    
    // Start transaction to ensure only one default agent
    await db.execute('START TRANSACTION');
    
    try {
      // Remove default from all agents
      await db.execute('UPDATE agents SET is_default = FALSE');
      
      // Set this agent as default
      await db.execute('UPDATE agents SET is_default = TRUE WHERE id = ?', [agentId]);
      
      await db.execute('COMMIT');
      
      res.json({ message: 'Default agent updated successfully' });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Set default agent error:', error);
    res.status(500).json({ message: 'Failed to set default agent' });
  }
});

module.exports = router;