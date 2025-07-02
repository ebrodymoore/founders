-- Database constraint updates to remove League and add Points format
-- Run these commands in your Supabase SQL Editor

-- Drop existing constraints
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;

-- Add new constraints without League type and with Points format
ALTER TABLE tournaments ADD CONSTRAINT tournaments_type_check 
  CHECK (type IN ('Major', 'Tour Event', 'SUPR', 'League Night'));

ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check 
  CHECK (format IN ('Stroke Play', 'Stableford', 'Points'));