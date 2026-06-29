-- TaxCoreAI Database Setup
-- This script drops existing tables and creates fresh ones

-- Drop existing tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS ai_prompts CASCADE;
DROP TABLE IF EXISTS pending_tasks CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS taxpayers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Taxpayers table
CREATE TABLE taxpayers (
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
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Filing', 'Return', 'Correspondence', 'License', 'Certificate', 'Contract', 'Invoice', 'Receipt', 'Other')),
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Expired', 'Pending Review', 'Flagged')),
  taxpayer_tin VARCHAR(50),
  taxpayer_name VARCHAR(255),
  taxpayer_id VARCHAR(255),
  file_name VARCHAR(500),
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  file_hash VARCHAR(255),
  version INTEGER DEFAULT 1,
  parent_document_id VARCHAR(255),
  period_start DATE,
  period_end DATE,
  expiry_date DATE,
  tags JSONB,
  metadata JSONB,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  analysis_status VARCHAR(50) DEFAULT 'pending',
  analysis_result JSONB,
  retention_policy VARCHAR(100),
  retention_expiry DATE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Document versions table for version control
CREATE TABLE document_versions (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_name VARCHAR(500),
  file_path TEXT,
  file_size BIGINT,
  file_hash VARCHAR(255),
  changes_description TEXT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, version)
);

-- Document access logs table
CREATE TABLE document_access_logs (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  username VARCHAR(100),
  action VARCHAR(100) NOT NULL CHECK (action IN ('VIEW', 'DOWNLOAD', 'EDIT', 'DELETE', 'SHARE', 'PRINT')),
  ip_address VARCHAR(50),
  user_agent TEXT,
  accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Document folders table for folder structure
CREATE TABLE document_folders (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(255) REFERENCES document_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Document folder items table (links documents to folders)
CREATE TABLE document_folder_items (
  id VARCHAR(255) PRIMARY KEY,
  folder_id VARCHAR(255) NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
  document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(folder_id, document_id)
);

-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Officer', 'Auditor', 'Supervisor')),
  title VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  username VARCHAR(100),
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflows table
CREATE TABLE workflows (
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
CREATE TABLE workflow_comments (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  username VARCHAR(100),
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow history table
CREATE TABLE workflow_history (
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
CREATE TABLE workflow_batches (
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
CREATE TABLE workflow_sla_rules (
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
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Unread',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,
  file_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AI Prompts table
CREATE TABLE ai_prompts (
  id VARCHAR(255) PRIMARY KEY,
  prompt TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pending tasks table
CREATE TABLE pending_tasks (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(500) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_taxpayers_tin ON taxpayers(tin);
CREATE INDEX idx_taxpayers_status ON taxpayers(status);
CREATE INDEX idx_taxpayers_type ON taxpayers(type);
CREATE INDEX idx_documents_taxpayer_tin ON documents(taxpayer_tin);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_taxpayer_id ON documents(taxpayer_id);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_id);
CREATE INDEX idx_document_folder_items_folder_id ON document_folder_items(folder_id);
CREATE INDEX idx_document_folder_items_document_id ON document_folder_items(document_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_assigned_to ON workflows(assigned_to);
CREATE INDEX idx_workflows_priority ON workflows(priority);
CREATE INDEX idx_workflows_due_date ON workflows(due_date);
CREATE INDEX idx_workflows_current_stage ON workflows(current_stage);
CREATE INDEX idx_workflow_comments_workflow_id ON workflow_comments(workflow_id);
CREATE INDEX idx_workflow_history_workflow_id ON workflow_history(workflow_id);

-- Insert seed data
INSERT INTO users (id, username, password_hash, name, role, title) VALUES
  ('user-admin', 'admin', '$2b$10$UtvWGSvbhcGjT/Xj/3Mw.ua.JbDkvHFY0F6uLnf4xr3d1KDE6Ftp.', 'System Administrator', 'Admin', 'System Administrator'),
  ('user-officer', 'officer', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Jeanine Uwase', 'Officer', 'Taxpayer Officer'),
  ('user-auditor', 'auditor', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Pierre Mukandayire', 'Auditor', 'Tax Auditor'),
  ('user-supervisor', 'supervisor', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Marie Habiyaremye', 'Supervisor', 'Audit Supervisor');