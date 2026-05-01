-- Add social media fields to ir_content_details
ALTER TABLE ir_content_details ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(200);
ALTER TABLE ir_content_details ADD COLUMN IF NOT EXISTS website_url VARCHAR(200);

-- Event poster images (EO can upload multiple posters per event)
CREATE TABLE IF NOT EXISTS ir_event_posters (
  id         BIGSERIAL PRIMARY KEY,
  content_details_id BIGINT NOT NULL REFERENCES ir_content_details(id) ON DELETE CASCADE,
  image_url  VARCHAR(200) NOT NULL,
  created_at BIGINT
);
