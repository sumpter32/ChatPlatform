const express = require('express');
const router = express.Router();
const axios = require('axios');
const { generateToken } = require('../utils/auth');
const { getDB } = require('../db/connection');

// Middleware to verify ChatPlatform API key from WordPress
const verifyChatPlatformApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-chatplatform-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'API key required' 
    });
  }
  
  try {
    const db = getDB();
    const [settings] = await db.execute(
      'SELECT value FROM platform_settings WHERE `key` = ? AND value = ?',
      ['chatplatform_api_key', apiKey]
    );
    
    if (settings.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key' 
      });
    }
    
    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Verify WordPress user session and subscription
router.post('/verify', async (req, res) => {
  try {
    const { sessionToken, userId } = req.body;
    
    if (!sessionToken || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session token and user ID required' 
      });
    }
    
    const db = getDB();
    
    // Get WordPress settings
    const [wpSettings] = await db.execute('SELECT * FROM wordpress_settings LIMIT 1');
    if (!wpSettings[0]) {
      return res.status(400).json({ 
        success: false, 
        message: 'WordPress not configured' 
      });
    }
    
    const wpUrl = wpSettings[0].url.replace(/\/$/, '');
    
    try {
      // Verify user session with WordPress
      const userResponse = await axios.post(
        `${wpUrl}/wp-json/chatplatform/v1/verify-session`,
        {
          session_token: sessionToken,
          user_id: userId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': wpSettings[0].api_key
          }
        }
      );
      
      if (!userResponse.data.valid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid WordPress session' 
        });
      }
      
      const wpUser = userResponse.data.user;
      
      // Check if user has active subscription
      if (!wpUser.has_active_subscription) {
        return res.status(403).json({ 
          success: false, 
          message: 'No active subscription',
          subscription_required: true
        });
      }
      
      // Sync user to local database
      const [existingUser] = await db.execute(
        'SELECT * FROM users WHERE wordpress_id = ?',
        [wpUser.id]
      );
      
      let localUserId;
      let localUser;
      
      if (existingUser.length === 0) {
        // Create new user
        const [result] = await db.execute(
          'INSERT INTO users (name, email, wordpress_id, role) VALUES (?, ?, ?, ?)',
          [wpUser.display_name, wpUser.email, wpUser.id, 'user']
        );
        localUserId = result.insertId;
        localUser = {
          id: localUserId,
          name: wpUser.display_name,
          email: wpUser.email,
          wordpress_id: wpUser.id,
          role: 'user'
        };
      } else {
        // Update existing user
        await db.execute(
          'UPDATE users SET name = ?, email = ? WHERE wordpress_id = ?',
          [wpUser.display_name, wpUser.email, wpUser.id]
        );
        localUserId = existingUser[0].id;
        localUser = existingUser[0];
        localUser.name = wpUser.display_name;
        localUser.email = wpUser.email;
      }
      
      // Generate local JWT token
      const token = generateToken(localUserId);
      
      res.json({
        success: true,
        token,
        user: {
          id: localUserId,
          name: localUser.name,
          email: localUser.email,
          wordpress_id: wpUser.id,
          role: localUser.role,
          subscription_status: wpUser.subscription_status,
          subscription_plan: wpUser.subscription_plan
        }
      });
      
    } catch (wpError) {
      console.error('WordPress API error:', wpError.response?.data || wpError.message);
      
      // Check if it's because the endpoint doesn't exist
      if (wpError.response?.status === 404) {
        return res.status(500).json({ 
          success: false, 
          message: 'WordPress ChatPlatform plugin not installed or activated' 
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: 'WordPress authentication failed' 
      });
    }
    
  } catch (error) {
    console.error('WordPress verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
});

// Check subscription status
router.get('/subscription-status', async (req, res) => {
  try {
    const wordpressId = req.user?.wordpress_id;
    
    if (!wordpressId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not a WordPress user' 
      });
    }
    
    const db = getDB();
    const [wpSettings] = await db.execute('SELECT * FROM wordpress_settings LIMIT 1');
    
    if (!wpSettings[0]) {
      return res.status(400).json({ 
        success: false, 
        message: 'WordPress not configured' 
      });
    }
    
    const wpUrl = wpSettings[0].url.replace(/\/$/, '');
    
    const response = await axios.get(
      `${wpUrl}/wp-json/chatplatform/v1/subscription-status/${wordpressId}`,
      {
        headers: {
          'X-API-Key': wpSettings[0].api_key
        }
      }
    );
    
    res.json({
      success: true,
      subscription: response.data
    });
    
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check subscription status' 
    });
  }
});

module.exports = router;