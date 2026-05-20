-- ==========================================================
-- OUTREACH TRACKER COMPLETE RE-INSTALLATION SCHEMA
-- ==========================================================
-- Copy and paste this script into your Supabase SQL Editor
-- to instantly configure your database schema!
-- ==========================================================

-- 1. Drop existing tables if they exist to prevent schema mismatch
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- 2. Create Leads Table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  company TEXT NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'replied', 'converted', 'rejected')),
  notes TEXT,
  linkedin_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Contacts Table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('Awaiting Response', 'Replied', 'Active Conversation', 'FollowUp Pending', 'prospect')),
  last_contacted TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  subject TEXT,
  thread_id TEXT,
  replied BOOLEAN DEFAULT false NOT NULL,
  last_reply TIMESTAMP WITH TIME ZONE,
  name TEXT,
  organization TEXT,
  linkedin_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Interactions Table
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'linkedin', 'meeting', 'other')),
  notes TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Disable Row-Level Security for development simplicity 
-- (This ensures you never get RLS Policy insertion errors)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;

-- 6. Explicitly reload the schema cache so Supabase recognizes the new columns instantly
NOTIFY pgrst, 'reload schema';
