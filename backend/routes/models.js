const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDB } = require('../db/connection');
const axios = require('axios');

router.get('/', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const [models] = await db.execute(
      'SELECT * FROM models ORDER BY name'
    );
    
    res.json({ models });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ message: 'Failed to fetch models' });
  }
});

router.post('/sync', authenticate, requireAdmin, async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    
    if (!baseUrl) {
      return res.status(400).json({ message: 'Base URL is required' });
    }
    
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    
    const response = await axios.get(`${baseUrl}/api/models`, { headers });
    
    // Open WebUI returns data in response.data.data
    const modelsData = response.data.data || response.data.models || response.data;
    
    if (!Array.isArray(modelsData)) {
      console.error('Invalid models response:', response.data);
      return res.status(400).json({ message: 'Invalid response from Open WebUI - expected array of models' });
    }
    
    const db = getDB();
    
    console.log(`Syncing ${modelsData.length} models from Open WebUI`);
    
    for (const model of modelsData) {
      const modelName = model.id || model.name;
      const provider = model.owned_by || model.provider || 'Open WebUI';
      const description = model.name || model.description || modelName;
      
      console.log(`Syncing model: ${modelName} (${provider})`);
      
      await db.execute(`
        INSERT INTO models (name, provider, description, enabled, last_synced)
        VALUES (?, ?, ?, true, NOW())
        ON DUPLICATE KEY UPDATE
          provider = VALUES(provider),
          description = VALUES(description),
          last_synced = NOW()
      `, [modelName, provider, description]);
    }
    
    const [syncedModels] = await db.execute(
      'SELECT * FROM models WHERE last_synced >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)'
    );
    
    res.json({
      message: 'Models synced successfully',
      count: syncedModels.length,
      models: syncedModels
    });
  } catch (error) {
    console.error('Sync models error:', error);
    res.status(500).json({ 
      message: 'Failed to sync models', 
      error: error.response?.data?.message || error.message 
    });
  }
});

router.put('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    
    await db.execute(
      'UPDATE models SET enabled = NOT enabled WHERE id = ?',
      [req.params.id]
    );
    
    res.json({ message: 'Model status toggled successfully' });
  } catch (error) {
    console.error('Toggle model error:', error);
    res.status(500).json({ message: 'Failed to toggle model' });
  }
});

module.exports = router;