import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gncekrblukrevvaojnft.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduY2VrcmJsdWtyZXZ2YW9qbmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTgyMjEsImV4cCI6MjA2Njc3NDIyMX0.Ie_zRvrDwITEAOHGEpeoXXByuxPBtch4fjwaP6LbM5U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export type Player = {
  id: string
  trackman_id: string
  display_name: string
  club: 'Sylvan' | '8th'
  created_at: string
}

export type Tournament = {
  id: string
  name: string
  date: string
  type: 'Major' | 'Tour Event' | 'League' | 'SUPR'
  format: 'Stroke Play' | 'Stableford'
  created_at: string
}

export type TournamentResult = {
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
export type PlayerStats = {
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