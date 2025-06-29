import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Player {
  id: string
  trackman_id: string
  display_name: string
  club: 'Sylvan' | '8th'
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  date: string
  type: 'Major' | 'Tour Event' | 'League' | 'SUPR'
  format: 'Stroke Play' | 'Stableford'
  created_at: string
}

export interface TournamentResult {
  id: string
  tournament_id: string
  player_id: string
  position: number
  gross_score: number
  net_score: number
  handicap: number
  points: number
  tied_players: number
  created_at: string
  // Relations
  player?: Player
  tournament?: Tournament
}

// Expanded result type for leaderboards
export interface PlayerStats {
  id: string
  trackman_id: string
  display_name: string
  club: 'Sylvan' | '8th'
  total_points: number
  counting_events: number
  total_events: number
  avg_gross: number
  avg_net: number
  best_finish: number
  all_events: TournamentResult[]
}