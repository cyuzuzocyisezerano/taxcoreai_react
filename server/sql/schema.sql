-- TaxCoreAI Database Schema

-- Taxpayers table
CREATE TABLE IF NOT EXISTS taxpayers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tin VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Business', 'Individual', 'Organization')),
  district VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Pending', 'Flagged')),
  registered TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  alias VARCHAR(255),
  business_name VARCHAR(255),
  address TEXT,
  contact VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  tax_regime VARCHAR(100),
  business_activity TEXT,
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  authorized_representative VARCHAR(255),
  representative_id VARCHAR(100),
  representative_contact VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Uploaded',
  taxpayer_tin VARCHAR(50),
  taxpayer_name VARCHAR(255),
  file_name VARCHAR(500),
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  analysis_status VARCHAR(50) DEFAULT 'pending',
  analysis_result JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Officer', 'Auditor', 'Supervisor')),
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  username VARCHAR(100),
  user_full_name VARCHAR(255),
  approval_status VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  document_id VARCHAR(255),
  taxpayer_tin VARCHAR(50),
  taxpayer_name VARCHAR(255),
  assigned_to VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'escalated')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date DATE,
  current_stage VARCHAR(100) DEFAULT 'received' CHECK (current_stage IN ('received', 'verified', 'approved', 'archived')),
  stages JSONB DEFAULT '[
    {"name":"received","status":"completed","completedAt":null},
    {"name":"verified","status":"pending","completedAt":null},
    {"name":"approved","status":"pending","completedAt":null},
    {"name":"archived","status":"pending","completedAt":null}
  ]'::jsonb,
  rejection_reason TEXT,
  owner VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow comments table
CREATE TABLE IF NOT EXISTS workflow_comments (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  username VARCHAR(100),
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow history table
CREATE TABLE IF NOT EXISTS workflow_history (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  from_stage VARCHAR(100),
  to_stage VARCHAR(100),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  user_id VARCHAR(255),
  username VARCHAR(100),
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow batch jobs table
CREATE TABLE IF NOT EXISTS workflow_batches (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  workflow_template JSONB,
  filters JSONB,
  created_by VARCHAR(255),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow SLA rules table
CREATE TABLE IF NOT EXISTS workflow_sla_rules (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  stage VARCHAR(100) NOT NULL,
  max_hours INTEGER NOT NULL,
  escalation_user_id VARCHAR(255),
  escalation_message TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Unread',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,
  file_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AI Prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id VARCHAR(255) PRIMARY KEY,
  prompt TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pending tasks table
CREATE TABLE IF NOT EXISTS pending_tasks (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(500) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_taxpayers_tin ON taxpayers(tin);
CREATE INDEX IF NOT EXISTS idx_taxpayers_status ON taxpayers(status);
CREATE INDEX IF NOT EXISTS idx_taxpayers_type ON taxpayers(type);
CREATE INDEX IF NOT EXISTS idx_documents_taxpayer_tin ON documents(taxpayer_tin);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON workflows(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority);
CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON workflows(due_date);
CREATE INDEX IF NOT EXISTS idx_workflows_current_stage ON workflows(current_stage);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_workflow_id ON workflow_comments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON workflow_history(workflow_id);

-- Insert seed data (passwords are hashed versions of the credentials below)
-- Admin: Admin@123
-- Officer: Officer@123
-- Auditor: Auditor@123
-- Supervisor: Supervisor@123
INSERT INTO users (id, username, email, full_name, password_hash, role, title, is_active) VALUES
  ('user-admin', 'admin', 'admin@taxcore.rw', 'System Administrator', '$2b$10$UtvWGSvbhcGjT/Xj/3Mw.ua.JbDkvHFY0F6uLnf4xr3d1KDE6Ftp.', 'Admin', 'System Administrator', true),
  ('user-officer', 'officer', 'officer@taxcore.rw', 'Jeanine Uwase', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Officer', 'Taxpayer Officer', true),
  ('user-auditor', 'auditor', 'auditor@taxcore.rw', 'Pierre Mukandayire', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Auditor', 'Tax Auditor', true),
  ('user-supervisor', 'supervisor', 'supervisor@taxcore.rw', 'Marie Habiyaremye', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Supervisor', 'Audit Supervisor', true)
ON CONFLICT (id) DO NOTHING;
