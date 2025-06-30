import { supabase } from '../lib/supabase'
import type { Player, Tournament, TournamentResult, PlayerStats } from '../lib/supabase'

// Player services
export const playerService = {
  // Get all players
  async getAll(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('display_name')
    
    if (error) throw error
    return data || []
  },

  // Get player by TrackmanID
  async getByTrackmanId(trackmanId: string): Promise<Player | null> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('trackman_id', trackmanId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Create new player
  async create(trackmanId: string, displayName: string, club: 'Sylvan' | '8th'): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert({
        trackman_id: trackmanId,
        display_name: displayName,
        club: club
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update player
  async update(id: string, updates: Partial<Pick<Player, 'display_name' | 'club'>>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete player
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get or create player by TrackmanID
  async getOrCreate(trackmanId: string, fallbackName?: string): Promise<Player> {
    let player = await this.getByTrackmanId(trackmanId)
    
    if (!player && fallbackName) {
      // Create new player with fallback data
      player = await this.create(trackmanId, fallbackName, 'Sylvan')
    }
    
    return player!
  },

  // Bulk create players
  async createBulk(players: Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}>): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .insert(players)
      .select()
    
    if (error) throw error
    return data || []
  },

  // Bulk upsert players (insert or update if exists)
  async upsertBulk(players: Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}>): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .upsert(players, { onConflict: 'trackman_id' })
      .select()
    
    if (error) throw error
    return data || []
  }
}

// Tournament services  
export const tournamentService = {
  // Get all tournaments
  async getAll(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get tournament by ID
  async getById(id: string): Promise<Tournament | null> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Create tournament
  async create(tournament: Omit<Tournament, 'id' | 'created_at'>): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournament)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update tournament
  async update(id: string, updates: Partial<Tournament>): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete tournament
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Tournament results services
export const tournamentResultService = {
  // Get results for a tournament
  async getByTournament(tournamentId: string): Promise<TournamentResult[]> {
    const { data, error } = await supabase
      .from('tournament_results')
      .select(`
        *,
        player:players(*)
      `)
      .eq('tournament_id', tournamentId)
      .order('net_position')
    
    if (error) throw error
    return data || []
  },

  // Get all results for a player
  async getByPlayer(playerId: string): Promise<TournamentResult[]> {
    const { data, error } = await supabase
      .from('tournament_results')
      .select(`
        *,
        tournament:tournaments(*)
      `)
      .eq('player_id', playerId)
      .order('tournament.date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Create tournament result
  async create(result: Omit<TournamentResult, 'id' | 'created_at' | 'updated_at'>): Promise<TournamentResult> {
    const { data, error } = await supabase
      .from('tournament_results')
      .insert(result)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Bulk create tournament results
  async createBulk(results: Omit<TournamentResult, 'id' | 'created_at' | 'updated_at'>[]): Promise<TournamentResult[]> {
    const { data, error } = await supabase
      .from('tournament_results')
      .insert(results)
      .select()
    
    if (error) throw error
    return data || []
  },

  // Update result
  async update(id: string, updates: Partial<TournamentResult>): Promise<TournamentResult> {
    const { data, error } = await supabase
      .from('tournament_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete result
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tournament_results')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Delete all results for a tournament
  async deleteByTournament(tournamentId: string): Promise<void> {
    const { error } = await supabase
      .from('tournament_results')
      .delete()
      .eq('tournament_id', tournamentId)
    
    if (error) throw error
  }
}

// Leaderboard services
export const leaderboardService = {
  // Get overall leaderboard with advanced stats
  async getOverallLeaderboard(clubFilter?: 'Sylvan' | '8th' | 'all', leaderboardType?: 'gross' | 'net'): Promise<PlayerStats[]> {
    const type = leaderboardType || 'net'; // Default to net
    
    const pointsColumn = type === 'gross' ? 'gross_points' : 'net_points'
    const positionColumn = type === 'gross' ? 'gross_position' : 'net_position'
    
    let query = supabase
      .from('tournament_results')
      .select(`
        player_id,
        ${pointsColumn},
        ${positionColumn},
        gross_score,
        net_score,
        tournament:tournaments(name, date, type),
        player:players(id, trackman_id, display_name, club)
      `)
    
    if (clubFilter && clubFilter !== 'all') {
      query = query.eq('player.club', clubFilter)
    }

    const { data, error } = await query
    
    if (error) throw error
    
    // Process results to calculate top 8 events and stats
    const playerStatsMap: Record<string, PlayerStats> = {}
    
    data?.forEach((result: any) => {
      const playerId = result.player_id
      const player = result.player
      
      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          id: player.id,
          trackman_id: player.trackman_id,
          display_name: player.display_name,
          club: player.club,
          total_points: 0,
          counting_events: 0,
          total_events: 0,
          avg_gross: 0,
          avg_net: 0,
          best_finish: Infinity,
          all_events: []
        }
      }
      
      const playerStats = playerStatsMap[playerId]
      const points = result[pointsColumn] || 0
      const position = result[positionColumn] || 999
      
      playerStats.all_events.push({
        ...result,
        points,
        position,
        tournament: result.tournament
      })
      playerStats.total_events++
      playerStats.best_finish = Math.min(playerStats.best_finish, position)
    })
    
    // Calculate top 8 events and final stats
    Object.values(playerStatsMap).forEach(player => {
      // Sort by points and take top 8
      const top8Events = player.all_events
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 8)
      
      player.counting_events = top8Events.length
      player.total_points = top8Events.reduce((sum, event) => sum + (event.points || 0), 0)
      
      if (top8Events.length > 0) {
        player.avg_gross = Math.round(top8Events.reduce((sum, event) => sum + event.gross_score, 0) / top8Events.length)
        player.avg_net = Math.round(top8Events.reduce((sum, event) => sum + event.net_score, 0) / top8Events.length)
      }
    })
    
    return Object.values(playerStatsMap)
      .filter(player => player.counting_events > 0)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points
        }
        return a.avg_net - b.avg_net
      })
  },

  // Get tournament leaderboard
  async getTournamentLeaderboard(tournamentId: string): Promise<TournamentResult[]> {
    return tournamentResultService.getByTournament(tournamentId)
  }
}

// Points calculation service
export const pointsService = {
  calculatePoints(position: number, tournamentType: string): number {
    const pointsSystem: Record<string, Record<number, number>> = {
      'Major': {
        1: 750, 2: 400, 3: 350, 4: 325, 5: 300, 6: 275, 7: 225, 8: 200, 9: 175, 10: 150,
        11: 130, 12: 120, 13: 110, 14: 100, 15: 90, 16: 80, 17: 70, 18: 65, 19: 60, 20: 55,
        21: 50, 22: 48, 23: 46, 24: 44, 25: 42, 26: 40, 27: 38, 28: 36, 29: 34, 30: 32.5,
        31: 31, 32: 29.5, 33: 28, 34: 26.5, 35: 25, 36: 24, 37: 23, 38: 22, 39: 21, 40: 20.25,
        41: 19.5, 42: 18.75, 43: 18, 44: 17.25, 45: 16.5, 46: 15.75, 47: 15, 48: 14.25, 49: 13.5, 50: 13,
        51: 12.5, 52: 12, 53: 11.5, 54: 11, 55: 10.5, 56: 10, 57: 9.5, 58: 9, 59: 8.5, 60: 8.25,
        61: 8, 62: 7.75, 63: 7.5, 64: 7.25, 65: 7, 66: 6.75, 67: 6.5, 68: 6.25, 69: 6, 70: 5.75,
        71: 5.5, 72: 5.25, 73: 5, 74: 4.75, 75: 4.5, 76: 4.25, 77: 4, 78: 3.75, 79: 3.5, 80: 3.25,
        81: 3, 82: 2.75, 83: 2.5, 84: 2.25, 85: 2
      },
      'Tour Event': {
        1: 500, 2: 300, 3: 190, 4: 135, 5: 110, 6: 100, 7: 90, 8: 85, 9: 80, 10: 75,
        11: 70, 12: 65, 13: 60, 14: 57, 15: 55, 16: 53, 17: 51, 18: 49, 19: 47, 20: 45,
        21: 43, 22: 41, 23: 39, 24: 37, 25: 35.5, 26: 34, 27: 32.5, 28: 31, 29: 29.5, 30: 28,
        31: 26.5, 32: 25, 33: 23.5, 34: 22, 35: 21, 36: 20, 37: 19, 38: 18, 39: 17, 40: 16,
        41: 15, 42: 14, 43: 13, 44: 12, 45: 11, 46: 10.5, 47: 10, 48: 9.5, 49: 9, 50: 8.5,
        51: 8, 52: 7.5, 53: 7, 54: 6.5, 55: 6, 56: 5.8, 57: 5.6, 58: 5.4, 59: 5.2, 60: 5,
        61: 4.8, 62: 4.6, 63: 4.4, 64: 4.2, 65: 4, 66: 3.8, 67: 3.6, 68: 3.4, 69: 3.2, 70: 3,
        71: 2.9, 72: 2.8, 73: 2.7, 74: 2.6, 75: 2.5, 76: 2.4, 77: 2.3, 78: 2.2, 79: 2.1, 80: 2,
        81: 1.9, 82: 1.8, 83: 1.7, 84: 1.6, 85: 1.5
      },
      'League': {
        1: 93.75, 2: 50, 3: 43.75, 4: 40.63, 5: 37.5, 6: 34.38, 7: 28.13, 8: 25, 9: 21.88, 10: 18.75,
        11: 16.25, 12: 15, 13: 13.75, 14: 12.5, 15: 11.25, 16: 10, 17: 8.75, 18: 8.13, 19: 7.5, 20: 6.88
      },
      'SUPR': {
        1: 93.75, 2: 50, 3: 43.75, 4: 40.63, 5: 37.5, 6: 34.38, 7: 28.13, 8: 25, 9: 21.88, 10: 18.75,
        11: 16.25, 12: 15, 13: 13.75, 14: 12.5, 15: 11.25, 16: 10, 17: 8.75, 18: 8.13, 19: 7.5, 20: 6.88
      }
    }

    const points = pointsSystem[tournamentType]
    return points[position] || (position <= 20 ? Math.max(30 - position, 5) : 0)
  }
}