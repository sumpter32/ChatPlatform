-- Drop all tables in the correct order (to avoid foreign key constraints)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_threads;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS wordpress_settings;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS users;