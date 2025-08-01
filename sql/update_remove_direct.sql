-- Update any existing agents that have 'direct' response_style to 'helpful'
UPDATE agents SET response_style = 'helpful' WHERE response_style = 'direct';