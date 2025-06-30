-- Migration script to add gross/net competition columns
-- Run this in the Supabase SQL editor

-- Add new columns for gross and net competitions to tournament_results
ALTER TABLE tournament_results 
ADD COLUMN IF NOT EXISTS gross_position INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS net_position INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS gross_points DECIMAL(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_points DECIMAL(6,2) DEFAULT 0;

-- Also remove NOT NULL constraint from existing position column if it exists
ALTER TABLE tournament_results ALTER COLUMN position DROP NOT NULL;

-- Add par column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS par INTEGER DEFAULT 72;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_results_gross_position ON tournament_results(gross_position);
CREATE INDEX IF NOT EXISTS idx_tournament_results_net_position ON tournament_results(net_position);

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tournament_results' 
AND column_name IN ('gross_position', 'net_position', 'gross_points', 'net_points')
ORDER BY column_name;
EOF < /dev/null