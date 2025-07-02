-- The Founders Series Golf Tournament Database Schema
-- Run this in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Players table - stores TrackmanID to Name/Club mappings
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trackman_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  club TEXT NOT NULL CHECK (club IN ('Sylvan', '8th')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Major', 'Tour Event', 'SUPR', 'League Night')),
  format TEXT NOT NULL CHECK (format IN ('Stroke Play', 'Stableford', 'Points')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament results table
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  gross_score INTEGER NOT NULL,
  net_score INTEGER NOT NULL,
  handicap DECIMAL(4,1) NOT NULL,
  points DECIMAL(6,2) NOT NULL,
  tied_players INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_trackman_id ON players(trackman_id);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(type);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_player_id ON tournament_results(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_position ON tournament_results(position);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_results_updated_at BEFORE UPDATE ON tournament_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (allow all operations for now - you can restrict later)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anonymous users
CREATE POLICY "Allow all operations on players" ON players
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on tournaments" ON tournaments
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on tournament_results" ON tournament_results
    FOR ALL USING (true);

-- Insert initial player mappings based on your TrackmanID data
INSERT INTO players (trackman_id, display_name, club) VALUES
('Andrew Walker', 'Andrew Walker', 'Sylvan'),
('Andy Aupperlee', 'Andy Auperlee', 'Sylvan'),
('Andy Faught', 'Andy Faught', '8th'),
('Annie Hinkel', 'Annie Hinkel', '8th'),
('Beau Briggs', 'Beau Briggs', 'Sylvan'),
('Bill Pepping', 'Bill Pepping', '8th'),
('Brian Abrahamsen', 'Brian Abrahamsen', 'Sylvan'),
('Camillo77', 'Camillo Colombo', '8th'),
('Chad_Mathews', 'Chad Mathews', '8th'),
('Chase Brannon', 'Chase Brannon', 'Sylvan'),
('Cody Larriviere', 'Cody Larriviere', 'Sylvan'),
('Cort McCown', 'Cort McCown', '8th'),
('Daniel Dorris', 'Daniel Dorris', '8th'),
('Dan Laughlin', 'Dan Laughlin', 'Sylvan'),
('Dean M. Miller', 'Dean M. Miller', '8th'),
('Eric Brody-Moore', 'Eric Brody-Moore', 'Sylvan'),
('Freddie Z', 'Freddie Zhang', 'Sylvan'),
('Gregory Hill', 'Gregory Hill', 'Sylvan'),
('GroverCollins', 'Grover Collins', 'Sylvan'),
('Jack Wheeler', 'Jack Wheeler', '8th'),
('Jason Broyles', 'Jason Broyles', '8th'),
('Jay LeDuc', 'Jay Leduc', 'Sylvan'),
('Jerry Buckmaster', 'Jerry Buckmaster', 'Sylvan'),
('Jim Kiedrowski', 'Jim Kiedrowski', 'Sylvan'),
('John ODonnell', 'John O''Donnell', '8th'),
('Ken Major', 'Ken Major', 'Sylvan'),
('M. Trebendis', 'Michael Trebendis', '8th'),
('Mark Dorris', 'Mark Dorris', '8th'),
('Mark Mendoza', 'Mark Mendoza', '8th'),
('MH Mills', 'Matt Mills', '8th'),
('Michael J Miller', 'Michael J Miller', '8th'),
('Michael Mendoza', 'Michael Mendoza', '8th'),
('Mike Miles', 'Mike Miles', '8th'),
('Nathan Ruff', 'Nathan Ruff', '8th'),
('Nima', 'Nima Hayati', '8th'),
('Patrick Dailey', 'Patrick Dailey', 'Sylvan'),
('Patrick Farno', 'Patrick Farno', 'Sylvan'),
('Philip L', 'Philip Leisy', '8th'),
('Puzzo', 'Dan Puzzo', 'Sylvan'),
('Rootae', 'John Root', '8th'),
('roy clancy', 'Roy Clancy', '8th'),
('Ryan Smith 323', 'Ryan Smith', 'Sylvan'),
('Sam Herb', 'Sam Herb', '8th'),
('Tate Kloeppel', 'Tate Kloeppel', 'Sylvan'),
('Tony Niknejad', 'Tony Niknejad', 'Sylvan'),
('Tucker Moore', 'Tucker Moore', 'Sylvan'),
('Tyler Ricker', 'Tyler Ricker', 'Sylvan'),
('Weller Emmons', 'Weller Emmons', 'Sylvan'),
('zandersteele', 'Zander Steele', 'Sylvan')
ON CONFLICT (trackman_id) DO NOTHING;

-- Create a view for leaderboard data
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    p.id,
    p.trackman_id,
    p.display_name,
    p.club,
    COALESCE(SUM(tr.points), 0) as total_points,
    COUNT(tr.id) as total_events,
    COALESCE(ROUND(AVG(tr.gross_score)), 0) as avg_gross,
    COALESCE(ROUND(AVG(tr.net_score)), 0) as avg_net,
    COALESCE(MIN(tr.position), 999) as best_finish
FROM players p
LEFT JOIN tournament_results tr ON p.id = tr.player_id
GROUP BY p.id, p.trackman_id, p.display_name, p.club
ORDER BY total_points DESC;