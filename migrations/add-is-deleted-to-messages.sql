-- Add is_deleted flag to Supabase messages table
-- Run this in Supabase SQL editor for project jbcdjttfaxwendlfpgjk
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages (is_deleted) WHERE is_deleted = true;
