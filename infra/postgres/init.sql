-- Initialize AI Interactive Classroom database
-- Creates test database and enables pgvector extension

-- Enable pgvector extension (requires pgvector/pgvector image)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create test database (separate from dev, see ADR-014)
SELECT 'CREATE DATABASE classroom_test OWNER classroom'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'classroom_test')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE classroom TO classroom;
