-- Add soft delete columns to ir_users for 30-day grace period deletion flow
ALTER TABLE ir_users
    ADD COLUMN IF NOT EXISTS is_deleted SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS scheduled_hard_delete_at BIGINT,
    ADD COLUMN IF NOT EXISTS original_username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS original_email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS original_display_name VARCHAR(100);

-- Index for efficient filtering of deleted users
CREATE INDEX IF NOT EXISTS idx_ir_users_is_deleted ON ir_users (is_deleted);
