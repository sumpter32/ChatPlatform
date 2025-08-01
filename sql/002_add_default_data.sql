-- Insert default model if not exists
INSERT INTO models (name, provider, description, enabled) 
SELECT 'gpt-3.5-turbo', 'OpenAI', 'Default GPT-3.5 model', true
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM models WHERE name = 'gpt-3.5-turbo');

-- Get the model ID
SET @model_id = (SELECT id FROM models WHERE name = 'gpt-3.5-turbo' LIMIT 1);

-- Insert default agent if not exists
INSERT INTO agents (name, greeting, prompt_template, model_id, response_style, active) 
SELECT 'Assistant', 
       'Hello! I\'m your AI assistant. How can I help you today?',
       'You are a helpful AI assistant. Respond to the user\'s message: {user_message}',
       @model_id,
       'helpful',
       true
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Assistant');