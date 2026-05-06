-- Add source column to distinguish feed vs detail impressions
-- 'feed' = card scrolled into view in feed
-- 'detail' = user opened the post detail screen
ALTER TABLE ir_impression_post_content_details
    ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'detail';

-- Ensure unique constraint exists (one row per user per post per source)
-- Drop old unique constraint if it only covered (users_id, post_content_details_id)
-- then recreate covering source too.
-- Run EXPLAIN to check existing indexes first; adjust constraint name as needed.
DO $$
BEGIN
    -- Add unique index if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'ir_impression_post_content_details'
          AND indexname = 'uq_impression_user_post_source'
    ) THEN
        CREATE UNIQUE INDEX uq_impression_user_post_source
            ON ir_impression_post_content_details (users_id, post_content_details_id, source);
    END IF;
END $$;
