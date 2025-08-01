const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDB } = require('../db/connection');
const axios = require('axios');
const { createParser } = require('eventsource-parser');

// Get all chat threads for the current user
router.get('/threads', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const [threads] = await db.execute(
      `SELECT ct.*, 
       (SELECT COUNT(*) FROM messages WHERE thread_id = ct.id) as message_count,
       (SELECT content FROM messages WHERE thread_id = ct.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_threads ct
       WHERE ct.user_id = ?
       ORDER BY ct.updated_at DESC`,
      [req.userId]
    );
    
    res.json({ threads });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ message: 'Failed to fetch threads' });
  }
});

// Create a new chat thread
router.post('/threads', authenticate, async (req, res) => {
  const { title, agentId } = req.body;
  
  try {
    const db = getDB();
    
    // Verify agent exists and is active
    const [agents] = await db.execute(
      'SELECT id, greeting FROM agents WHERE id = ? AND active = true',
      [agentId]
    );
    
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found or inactive' });
    }
    
    // Create thread
    const [result] = await db.execute(
      'INSERT INTO chat_threads (user_id, title) VALUES (?, ?)',
      [req.userId, title || 'New Chat']
    );
    
    const threadId = result.insertId;
    
    // Add greeting message if agent has one
    if (agents[0].greeting) {
      await db.execute(
        'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
        [threadId, 'assistant', agents[0].greeting]
      );
    }
    
    res.json({ 
      threadId,
      message: 'Thread created successfully' 
    });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ message: 'Failed to create thread' });
  }
});

// Get messages for a thread
router.get('/threads/:threadId/messages', authenticate, async (req, res) => {
  try {
    const db = getDB();
    
    // Verify thread belongs to user
    const [threads] = await db.execute(
      'SELECT id FROM chat_threads WHERE id = ? AND user_id = ?',
      [req.params.threadId, req.userId]
    );
    
    if (threads.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    const [messages] = await db.execute(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC',
      [req.params.threadId]
    );
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message and get response
router.post('/threads/:threadId/messages', authenticate, async (req, res) => {
  const { content, agentId } = req.body;
  
  if (!content || !agentId) {
    return res.status(400).json({ message: 'Content and agentId are required' });
  }
  
  try {
    const db = getDB();
    
    // Verify thread belongs to user
    const [threads] = await db.execute(
      'SELECT id FROM chat_threads WHERE id = ? AND user_id = ?',
      [req.params.threadId, req.userId]
    );
    
    if (threads.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    // Get agent details
    const [agents] = await db.execute(
      `SELECT a.*, m.name as model_name
       FROM agents a
       JOIN models m ON a.model_id = m.id
       WHERE a.id = ? AND a.active = true`,
      [agentId]
    );
    
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found or inactive' });
    }
    
    const agent = agents[0];
    
    // Save user message
    await db.execute(
      'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
      [req.params.threadId, 'user', content]
    );
    
    // Get recent messages for context
    const [recentMessages] = await db.execute(
      `SELECT role, content FROM messages 
       WHERE thread_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.params.threadId]
    );
    
    // Build conversation history
    const messages = recentMessages.reverse().map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    // Prepare the prompt
    let systemPrompt = agent.prompt_template
      .replace('{agent_name}', agent.name)
      .replace('{user_message}', content);
    
    // Add response style instructions
    if (agent.response_style !== 'direct') {
      const styleInstructions = {
        casual: 'Respond in a casual, friendly manner.',
        parables: 'Respond using parables and metaphors to illustrate your points.',
        king_james: 'Respond in the style of the King James Bible, using archaic English.'
      };
      systemPrompt += '\n\n' + styleInstructions[agent.response_style];
    }
    
    // Get Open WebUI settings
    const openWebUIUrl = process.env.OPEN_WEBUI_BASE_URL || 'http://localhost:8080';
    const openWebUIKey = process.env.OPEN_WEBUI_API_KEY || '';
    
    let assistantResponse;
    
    try {
      // Prepare the chat request for Open WebUI
      const chatRequest = {
        model: agent.model_name,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-9), // Include last 9 messages for context
          { role: 'user', content: content }
        ],
        temperature: parseFloat(agent.temperature) || 0.7,
        max_tokens: parseInt(agent.max_tokens) || 2048,
        stream: false
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (openWebUIKey) {
        headers['Authorization'] = `Bearer ${openWebUIKey}`;
      }
      
      // Call Open WebUI API
      const response = await axios.post(
        `${openWebUIUrl}/api/chat/completions`,
        chatRequest,
        { headers, timeout: 30000 }
      );
      
      assistantResponse = response.data.choices[0].message.content;
    } catch (error) {
      console.error('Open WebUI API error:', error.response?.data || error.message);
      
      // Provide specific error messages based on the error type
      if (error.response?.status === 401) {
        assistantResponse = `Authentication failed with Open WebUI. Please ensure you have configured a valid API key in the .env file (OPEN_WEBUI_API_KEY). You can get an API key from Open WebUI settings.`;
      } else if (error.response?.status === 404) {
        assistantResponse = `The AI model "${agent.model_name}" was not found in Open WebUI. Please sync your models in the admin panel or select a different agent.`;
      } else if (error.code === 'ECONNREFUSED') {
        assistantResponse = `I cannot connect to Open WebUI at ${openWebUIUrl}. Please ensure Open WebUI is running and accessible.`;
      } else if (error.response?.data?.detail) {
        assistantResponse = `Open WebUI error: ${error.response.data.detail}`;
      } else {
        assistantResponse = `I apologize, but I'm having trouble connecting to the AI service. Error: ${error.message}`;
      }
    }
    
    // Save assistant response
    const [messageResult] = await db.execute(
      'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
      [req.params.threadId, 'assistant', assistantResponse]
    );
    
    // Update thread timestamp
    await db.execute(
      'UPDATE chat_threads SET updated_at = NOW() WHERE id = ?',
      [req.params.threadId]
    );
    
    res.json({
      message: {
        id: messageResult.insertId,
        role: 'assistant',
        content: assistantResponse,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Send a message with streaming support
router.post('/threads/:threadId/messages/stream', authenticate, async (req, res) => {
  const { content, agentId } = req.body;
  
  if (!content || !agentId) {
    return res.status(400).json({ message: 'Content and agentId are required' });
  }
  
  try {
    const db = getDB();
    
    // Verify thread belongs to user
    const [threads] = await db.execute(
      'SELECT id FROM chat_threads WHERE id = ? AND user_id = ?',
      [req.params.threadId, req.userId]
    );
    
    if (threads.length === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    // Get agent details
    const [agents] = await db.execute(
      `SELECT a.*, m.name as model_name
       FROM agents a
       JOIN models m ON a.model_id = m.id
       WHERE a.id = ? AND a.active = true`,
      [agentId]
    );
    
    if (agents.length === 0) {
      return res.status(404).json({ message: 'Agent not found or inactive' });
    }
    
    const agent = agents[0];
    
    // Save user message
    await db.execute(
      'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
      [req.params.threadId, 'user', content]
    );
    
    // Get recent messages for context
    const [recentMessages] = await db.execute(
      `SELECT role, content FROM messages 
       WHERE thread_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.params.threadId]
    );
    
    // Build conversation history
    const messages = recentMessages.reverse().map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    // Prepare the prompt
    let systemPrompt = agent.prompt_template
      .replace('{agent_name}', agent.name)
      .replace('{user_message}', content);
    
    // Add response style instructions
    if (agent.response_style !== 'direct') {
      const styleInstructions = {
        casual: 'Respond in a casual, friendly manner.',
        parables: 'Respond using parables and metaphors to illustrate your points.',
        king_james: 'Respond in the style of the King James Bible, using archaic English.'
      };
      systemPrompt += '\n\n' + styleInstructions[agent.response_style];
    }
    
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Get Open WebUI settings
    const openWebUIUrl = process.env.OPEN_WEBUI_BASE_URL || 'http://localhost:8080';
    const openWebUIKey = process.env.OPEN_WEBUI_API_KEY || '';
    
    let fullResponse = '';
    let messageId = null;
    
    try {
      // Prepare the chat request for Open WebUI
      const chatRequest = {
        model: agent.model_name,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-9),
          { role: 'user', content: content }
        ],
        temperature: parseFloat(agent.temperature) || 0.7,
        max_tokens: parseInt(agent.max_tokens) || 2048,
        stream: true
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      
      if (openWebUIKey) {
        headers['Authorization'] = `Bearer ${openWebUIKey}`;
      }
      
      // Call Open WebUI API with streaming
      const response = await axios.post(
        `${openWebUIUrl}/api/chat/completions`,
        chatRequest,
        { 
          headers, 
          responseType: 'stream',
          timeout: 30000 
        }
      );
      
      const parser = createParser((event) => {
        if (event.type === 'event') {
          if (event.data === '[DONE]') {
            // Save the complete message to database
            if (fullResponse && messageId === null) {
              db.execute(
                'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
                [req.params.threadId, 'assistant', fullResponse]
              ).then(([result]) => {
                messageId = result.insertId;
                res.write(`data: ${JSON.stringify({ done: true, messageId })}\n\n`);
                res.end();
              });
            } else {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              res.end();
            }
            return;
          }
          
          try {
            const data = JSON.parse(event.data);
            const chunk = data.choices[0]?.delta?.content || '';
            if (chunk) {
              fullResponse += chunk;
              res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      });
      
      response.data.on('data', (chunk) => {
        parser.feed(chunk.toString());
      });
      
      response.data.on('end', () => {
        if (!messageId && fullResponse) {
          db.execute(
            'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)',
            [req.params.threadId, 'assistant', fullResponse]
          ).then(() => {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
          });
        }
      });
      
      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      });
      
    } catch (error) {
      console.error('Open WebUI API error:', error.response?.data || error.message);
      
      const errorMessage = error.code === 'ECONNREFUSED' 
        ? `Cannot connect to AI service at ${openWebUIUrl}`
        : 'AI service error. Please try again.';
      
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
    
    // Update thread timestamp
    await db.execute(
      'UPDATE chat_threads SET updated_at = NOW() WHERE id = ?',
      [req.params.threadId]
    );
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Delete a thread
router.delete('/threads/:threadId', authenticate, async (req, res) => {
  try {
    const db = getDB();
    
    const [result] = await db.execute(
      'DELETE FROM chat_threads WHERE id = ? AND user_id = ?',
      [req.params.threadId, req.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ message: 'Failed to delete thread' });
  }
});

// Share chat via email endpoint
router.post('/threads/:threadId/share', authenticate, async (req, res) => {
  const { threadId } = req.params;
  const { email, format = 'text' } = req.body;
  const db = req.db;
  
  try {
    // Get thread details with messages
    const [thread] = await db.execute(
      `SELECT ct.*, a.name as agent_name, a.icon_url
       FROM chat_threads ct
       JOIN agents a ON ct.agent_id = a.id
       WHERE ct.id = ? AND ct.user_id = ?`,
      [threadId, req.user.id]
    );
    
    if (!thread[0]) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }
    
    const [messages] = await db.execute(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at',
      [threadId]
    );
    
    // Format the conversation
    let emailContent = `Chat with ${thread[0].agent_name}\n`;
    emailContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
    emailContent += '================================\n\n';
    
    messages.forEach(msg => {
      const sender = msg.role === 'user' ? 'You' : thread[0].agent_name;
      const time = new Date(msg.created_at).toLocaleTimeString();
      emailContent += `${sender} (${time}):\n${msg.content}\n\n---\n\n`;
    });
    
    emailContent += '================================\n';
    emailContent += 'Generated from AI Chat Platform';
    
    // In production, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just return the formatted content
    res.json({ 
      success: true, 
      content: emailContent,
      message: 'Email content prepared. In production, this would be sent via email service.' 
    });
  } catch (error) {
    console.error('Failed to share chat:', error);
    res.status(500).json({ success: false, message: 'Failed to share chat' });
  }
});

module.exports = router;