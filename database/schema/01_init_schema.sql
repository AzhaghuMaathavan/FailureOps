-- =============================================================================
-- FailureOps X — Database Schema Definition (PostgreSQL 16 + pgvector)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code_name VARCHAR(100),
    company VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    stage VARCHAR(50),
    description TEXT,
    target_users VARCHAR(255),
    expected_launch_date VARCHAR(50),
    privacy_level VARCHAR(50) DEFAULT 'ORGANIZATION',
    health VARCHAR(50) DEFAULT 'HEALTHY',
    failure_risk FLOAT DEFAULT 0.0,
    risk_trend VARCHAR(100),
    predicted_next_failure TEXT,
    prediction_confidence FLOAT DEFAULT 0.0,
    historical_similarity FLOAT DEFAULT 0.0,
    sources_uploaded JSONB DEFAULT '[]'::jsonb,
    last_analyzed_at TIMESTAMP,
    active_failure_seeds_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    storage_provider VARCHAR(50) DEFAULT 'rustfs',
    storage_path TEXT,
    total_chunks INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks (pgvector 2048-dim)
CREATE TABLE IF NOT EXISTS chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT,
    section_header VARCHAR(255),
    start_char INT,
    end_char INT,
    embedding vector(2048),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chunks_project_id ON chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);

-- 4. Evidence Items
CREATE TABLE IF NOT EXISTS evidence (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_id VARCHAR(64) REFERENCES documents(id) ON DELETE SET NULL,
    source_type VARCHAR(100),
    document_name VARCHAR(255),
    page_or_section VARCHAR(100),
    evidence_type VARCHAR(50) NOT NULL,
    claim TEXT NOT NULL,
    value TEXT,
    unit VARCHAR(50),
    confidence FLOAT DEFAULT 1.0,
    visibility VARCHAR(50) DEFAULT 'ORGANIZATION',
    snippet_context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Signals Table
CREATE TABLE IF NOT EXISTS signals (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    direction VARCHAR(50) DEFAULT 'NEGATIVE',
    trend VARCHAR(50),
    confidence FLOAT DEFAULT 1.0,
    metric_change VARCHAR(100),
    supporting_evidence_ids JSONB DEFAULT '[]'::jsonb,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Analyses Table
CREATE TABLE IF NOT EXISTS analyses (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    overall_risk FLOAT DEFAULT 0.0,
    dominant_archetype VARCHAR(255),
    dimensions JSONB DEFAULT '[]'::jsonb,
    evidence_count INT DEFAULT 0,
    signals_count INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
