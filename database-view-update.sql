-- Update the leaderboard view to use the correct gross_points and net_points columns
-- Run this in your Supabase SQL Editor

-- Drop the existing view
DROP VIEW IF EXISTS leaderboard_view;

-- Create updated leaderboard view with correct column names
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    p.id,
    p.trackman_id,
    p.display_name,
    p.club,
    COALESCE(SUM(tr.gross_points + tr.net_points), 0) as total_points,
    COUNT(tr.id) as total_events,
    COALESCE(ROUND(AVG(tr.gross_score)), 0) as avg_gross,
    COALESCE(ROUND(AVG(tr.net_score)), 0) as avg_net,
    COALESCE(MIN(tr.gross_position), 999) as best_finish
FROM players p
LEFT JOIN tournament_results tr ON p.id = tr.player_id
GROUP BY p.id, p.trackman_id, p.display_name, p.club
ORDER BY total_points DESC;