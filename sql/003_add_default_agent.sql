-- Add is_default column to agents table
ALTER TABLE agents ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- Make sure only one agent can be default at a time
-- Set the first active agent as default if none exists
UPDATE agents SET is_default = TRUE 
WHERE id = (
    SELECT id FROM (
        SELECT id FROM agents 
        WHERE active = TRUE 
        ORDER BY created_at ASC 
        LIMIT 1
    ) AS first_agent
) 
AND NOT EXISTS (
    SELECT 1 FROM agents WHERE is_default = TRUE
);