-- Migration: Replace single competition with separate gross and net competitions
-- Run this in your Supabase SQL Editor

-- Remove old columns and add new ones
ALTER TABLE tournament_results 
DROP COLUMN position,
DROP COLUMN points,
ADD COLUMN gross_position INTEGER NOT NULL DEFAULT 999,
ADD COLUMN net_position INTEGER NOT NULL DEFAULT 999,
ADD COLUMN gross_points DECIMAL(6,2) NOT NULL DEFAULT 0,
ADD COLUMN net_points DECIMAL(6,2) NOT NULL DEFAULT 0;

-- Add indexes for the new position columns
CREATE INDEX IF NOT EXISTS idx_tournament_results_gross_position ON tournament_results(gross_position);
CREATE INDEX IF NOT EXISTS idx_tournament_results_net_position ON tournament_results(net_position);