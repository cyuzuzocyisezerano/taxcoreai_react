-- Example taxpayers table for TaxCoreAI
-- Adjust types and columns to match your production data

CREATE TABLE IF NOT EXISTS taxpayers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tin TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  district TEXT,
  status TEXT,
  registered TIMESTAMP WITH TIME ZONE,
  alias TEXT
);

-- Indexes to speed up search
CREATE INDEX IF NOT EXISTS taxpayers_name_idx ON taxpayers USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS taxpayers_alias_idx ON taxpayers USING gin (to_tsvector('english', alias));
CREATE INDEX IF NOT EXISTS taxpayers_tin_idx ON taxpayers (tin);
