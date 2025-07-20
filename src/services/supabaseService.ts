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

  // Get player by display name (case-insensitive)
  async getByDisplayName(displayName: string): Promise<Player | null> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('display_name', displayName)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Search players by name (fuzzy matching for variations)
  async searchByName(name: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('display_name', `%${name}%`)
      .order('display_name')
    
    if (error) throw error
    return data || []
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
      
      // Skip if player data is missing
      if (!player) {
        console.warn('Player data missing for result:', result)
        return
      }
      
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
    
    // Calculate top 8 events and final stats based on leaderboard type
    Object.values(playerStatsMap).forEach(player => {
      // Sort by the points for the specific leaderboard type and take top 8
      const top8Events = player.all_events
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 8)
      
      player.counting_events = top8Events.length
      player.total_points = top8Events.reduce((sum, event) => sum + (event.points || 0), 0)
      
      if (top8Events.length > 0) {
        // Always calculate both averages, but based on the actual scores used for this leaderboard type
        const scoreType = type === 'gross' ? 'gross_score' : 'net_score'
        const avgScore = Math.round(top8Events.reduce((sum, event) => sum + event[scoreType], 0) / top8Events.length)
        
        if (type === 'gross') {
          player.avg_gross = avgScore
          player.avg_net = avgScore // For display consistency when toggling
        } else {
          player.avg_gross = avgScore // For display consistency when toggling  
          player.avg_net = avgScore
        }
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
        1: 750, 2: 400, 3: 350, 4: 325, 5: 300, 6: 275, 7: 250, 8: 225, 9: 200, 10: 175,
        11: 150, 12: 130, 13: 120, 14: 110, 15: 90, 16: 80, 17: 70, 18: 65, 19: 60, 20: 55,
        21: 50, 22: 48, 23: 46, 24: 44, 25: 42, 26: 40, 27: 38, 28: 36, 29: 34, 30: 32.5,
        31: 31, 32: 29.5, 33: 28, 34: 26.5, 35: 25, 36: 24, 37: 23, 38: 22, 39: 21, 40: 20.25,
        41: 19.5, 42: 18.75, 43: 18, 44: 17.25, 45: 16.5, 46: 15.75, 47: 15, 48: 14.25, 49: 13.5, 50: 13,
        51: 12.5, 52: 12, 53: 11.5, 54: 11, 55: 10.5, 56: 10, 57: 9.5, 58: 9, 59: 8.5, 60: 8,
        61: 7.75, 62: 7.5, 63: 7.25, 64: 7
      },
      'Tour Event': {
        1: 500, 2: 300, 3: 190, 4: 135, 5: 110, 6: 100, 7: 90, 8: 85, 9: 80, 10: 75,
        11: 70, 12: 65, 13: 60, 14: 55, 15: 53, 16: 51, 17: 49, 18: 47, 19: 45, 20: 43,
        21: 41, 22: 39, 23: 37, 24: 35.5, 25: 34, 26: 32.5, 27: 31, 28: 29.5, 29: 28, 30: 26.5,
        31: 25, 32: 23.5, 33: 22, 34: 21, 35: 20, 36: 19, 37: 18, 38: 17, 39: 16, 40: 15,
        41: 14, 42: 13, 43: 12, 44: 11, 45: 10.5, 46: 10, 47: 9.5, 48: 9, 49: 8.5, 50: 8,
        51: 7.5, 52: 7, 53: 6.5, 54: 6, 55: 5.8, 56: 5.6, 57: 5.4, 58: 5.2, 59: 5, 60: 4.8,
        61: 4.6, 62: 4.4, 63: 4.2, 64: 4, 65: 3.8
      },
      'League': {
        1: 93.75, 2: 50, 3: 43.75, 4: 40.625, 5: 37.5, 6: 34.375, 7: 28.125, 8: 25, 9: 21.875, 10: 18.75,
        11: 16.25, 12: 15, 13: 13.75, 14: 11.25, 15: 10, 16: 8.75, 17: 8.125, 18: 7.5, 19: 6.875, 20: 6
      },
      'SUPR': {
        1: 93.75, 2: 50, 3: 43.75, 4: 40.625, 5: 37.5, 6: 34.375, 7: 28.125, 8: 25, 9: 21.875, 10: 18.75,
        11: 16.25, 12: 15, 13: 13.75, 14: 11.25, 15: 10, 16: 8.75, 17: 8.125, 18: 7.5, 19: 6.875, 20: 6
      }
    }

    const points = pointsSystem[tournamentType]
    if (points[position]) {
      return points[position]
    }
    
    // For League tournaments, no points beyond position 20
    if (tournamentType === 'League') {
      return 0
    }
    
    // For other tournament types, use fallback calculation
    return position <= 20 ? Math.max(30 - position, 5) : 0
  }
}

// Tournament recalculation service
export const recalculationService = {
  async recalculateTournament(tournamentId: string) {
    try {
      // Get tournament data
      const tournament = await tournamentService.getById(tournamentId)
      if (!tournament) {
        throw new Error('Tournament not found')
      }

      // Get all results for this tournament
      const results = await tournamentResultService.getByTournament(tournamentId)
      if (!results || results.length === 0) {
        throw new Error('No results found for this tournament')
      }

      // Use the same tie-handling logic from useSupabaseData
      const assignPositionsWithTies = (sortedResults: any[], scoreField: string, positionField: string, pointsField: string) => {
        let currentPosition = 1;
        let i = 0;
        
        while (i < sortedResults.length) {
          const currentScore = sortedResults[i][scoreField];
          
          // Find all players with the same score (using tolerance for floating-point comparison)
          let tiedPlayers = 1;
          while (i + tiedPlayers < sortedResults.length && Math.abs(sortedResults[i + tiedPlayers][scoreField] - currentScore) < 0.001) {
            tiedPlayers++;
          }
          
          // Calculate total points for tied positions and distribute evenly
          let totalPoints = 0;
          for (let pos = currentPosition; pos < currentPosition + tiedPlayers; pos++) {
            totalPoints += pointsService.calculatePoints(pos, tournament.type);
          }
          const averagePoints = totalPoints / tiedPlayers;
          
          // Assign position and points to all tied players
          for (let j = 0; j < tiedPlayers; j++) {
            sortedResults[i + j][positionField] = currentPosition;
            sortedResults[i + j][pointsField] = averagePoints;
            sortedResults[i + j].tied_players = tiedPlayers;
          }
          
          // Move to next position group
          currentPosition += tiedPlayers;
          i += tiedPlayers;
        }
      };

      // Handle Points format tournaments differently
      console.log('🔄 Recalculating tournament:', {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        format: tournament.format,
        resultsCount: results.length
      });
      
      if (tournament.format === 'Points') {
        console.log('📊 Processing as direct points tournament');
        // For Points format, sort by points (higher points = better position) and only assign positions
        const grossSorted = [...results].sort((a, b) => (b.gross_points || 0) - (a.gross_points || 0));
        const netSorted = [...results].sort((a, b) => (b.net_points || 0) - (a.net_points || 0));
        
        // For Points format, ONLY assign positions and NEVER modify the points values
        const assignPositionsOnly = (sortedResults: any[], pointsField: string, positionField: string) => {
          let currentPosition = 1;
          let i = 0;
          
          while (i < sortedResults.length) {
            const currentPoints = sortedResults[i][pointsField] || 0;
            
            // Find all players with the same points
            let tiedPlayers = 1;
            while (i + tiedPlayers < sortedResults.length && 
                   Math.abs((sortedResults[i + tiedPlayers][pointsField] || 0) - currentPoints) < 0.001) {
              tiedPlayers++;
            }
            
            // Assign position but keep original points
            for (let j = 0; j < tiedPlayers; j++) {
              sortedResults[i + j][positionField] = currentPosition;
              sortedResults[i + j].tied_players = tiedPlayers;
              // Don't overwrite the points - they're already set as direct points
            }
            
            currentPosition += tiedPlayers;
            i += tiedPlayers;
          }
        };
        
        console.log('🎯 Direct points before position assignment:', results.map(r => ({
          id: r.id,
          player: r.player?.display_name,
          gross_points: r.gross_points,
          net_points: r.net_points
        })));
        
        assignPositionsOnly(grossSorted, 'gross_points', 'gross_position');
        assignPositionsOnly(netSorted, 'net_points', 'net_position');
        
        console.log('🎯 Direct points after position assignment:', results.map(r => ({
          id: r.id,
          player: r.player?.display_name,
          gross_points: r.gross_points,
          net_points: r.net_points,
          gross_position: r.gross_position,
          net_position: r.net_position
        })));
      } else {
        console.log('📊 Processing as regular tournament (scores -> calculated points)');
        // Regular tournament recalculation
        const grossSorted = [...results].sort((a, b) => 
          tournament.format === 'Stableford' ? b.gross_score - a.gross_score : a.gross_score - b.gross_score
        );
        assignPositionsWithTies(grossSorted, 'gross_score', 'gross_position', 'gross_points');

        const netSorted = [...results].sort((a, b) => 
          tournament.format === 'Stableford' ? b.net_score - a.net_score : a.net_score - b.net_score
        );
        assignPositionsWithTies(netSorted, 'net_score', 'net_position', 'net_points');
      }

      // Update all results in the database
      const updates = results.map(result => ({
        id: result.id,
        gross_position: result.gross_position,
        net_position: result.net_position,
        gross_points: result.gross_points,
        net_points: result.net_points,
        tied_players: result.tied_players
      }));

      for (const update of updates) {
        await tournamentResultService.update(update.id, update);
      }

      return { success: true, updatedResults: updates.length };
    } catch (error) {
      console.error('Error recalculating tournament:', error);
      throw error;
    }
  },

  async recalculateAllTournaments() {
    try {
      const tournaments = await tournamentService.getAll();
      const results = [];
      
      for (const tournament of tournaments) {
        try {
          const result = await this.recalculateTournament(tournament.id);
          results.push({ tournamentId: tournament.id, name: tournament.name, ...result });
        } catch (error) {
          results.push({ tournamentId: tournament.id, name: tournament.name, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error recalculating all tournaments:', error);
      throw error;
    }
  }
}