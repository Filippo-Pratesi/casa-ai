-- 073_listing_notes_sentiment.sql
-- Add sentiment column to listing_notes for agent note mood tracking

ALTER TABLE listing_notes
  ADD COLUMN IF NOT EXISTS sentiment TEXT
    CHECK (sentiment IN ('positive', 'neutral', 'negative'));
