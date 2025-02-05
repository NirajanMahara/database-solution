/*
  # Initial Database Schema for Refined Stack Co.

  1. New Tables
    - `users` - Extended user profile data
      - `id` (uuid, primary key) - Links to auth.users
      - `full_name` (text) - User's full name
      - `role` (text) - User's role (admin, manager, user)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text) - Organization name
      - `settings` (jsonb) - Organization settings
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid) - Reference to organizations
      - `user_id` (uuid) - Reference to users
      - `role` (text) - Member role in organization
      - `created_at` (timestamp)
    
    - `projects`
      - `id` (uuid, primary key)
      - `organization_id` (uuid) - Reference to organizations
      - `name` (text) - Project name
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `documents`
      - `id` (uuid, primary key)
      - `project_id` (uuid) - Reference to projects
      - `name` (text)
      - `content` (text)
      - `encrypted_content` (bytea) - For sensitive documents
      - `created_by` (uuid) - Reference to users
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access
    - Set up role-based access control
*/

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text,
  encrypted_content bytea,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Organization policies
CREATE POLICY "Organization members can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

-- Organization members policies
CREATE POLICY "Members can view organization membership"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members members
      WHERE members.organization_id = organization_members.organization_id
      AND members.user_id = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Organization members can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = projects.organization_id
      AND user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Organization members can view documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      JOIN projects ON projects.organization_id = organization_members.organization_id
      WHERE projects.id = documents.project_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Functions for document encryption
CREATE OR REPLACE FUNCTION encrypt_document(
  content text,
  encryption_key text
) RETURNS bytea AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    content,
    encryption_key,
    'cipher-algo=aes256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_document(
  encrypted_content bytea,
  encryption_key text
) RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    encrypted_content,
    encryption_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;