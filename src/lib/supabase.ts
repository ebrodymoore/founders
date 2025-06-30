import { createClient } from '@supabase/supabase-js'

// Environment variables - will be set in Vercel dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/[\r\n\t\s]/g, '')

// Debug: Check for invalid characters in the token
if (supabaseAnonKey && /[\r\n\t]/.test(supabaseAnonKey)) {
  console.error('Invalid characters found in SUPABASE_ANON_KEY')
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel dashboard.')
}

// Debug logging for production troubleshooting
console.log('Supabase config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  environment: import.meta.env.MODE
})

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
  gross_position: number
  net_position: number
  gross_score: number
  net_score: number
  handicap: number
  gross_points: number
  net_points: number
  tied_players: number
  created_at: string
  // Relations
  player?: Player
  tournament?: Tournament
  // Aliased fields from queries
  points?: number  // Will be gross_points or net_points depending on query
  position?: number // Will be gross_position or net_position depending on query
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