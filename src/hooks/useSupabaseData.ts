import { useState, useEffect, useCallback } from 'react'
import { 
  playerService, 
  tournamentService, 
  tournamentResultService, 
  leaderboardService,
  pointsService 
} from '../services/supabaseService'
import type { Player, Tournament, TournamentResult, PlayerStats } from '../lib/supabase'

export const useSupabaseData = () => {
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [players, setPlayers] = useState<Player[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  
  // Notification state
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  // Show notification helper
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Error handler
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error)
    setError(error.message || 'An error occurred')
    showNotification(`Error: ${error.message || 'An error occurred'}`, 'error')
  }, [showNotification])

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [playersData, tournamentsData] = await Promise.all([
        playerService.getAll(),
        tournamentService.getAll()
      ])
      
      setPlayers(playersData)
      setTournaments(tournamentsData)
    } catch (error) {
      handleError(error, 'loadInitialData')
    } finally {
      setIsLoading(false)
    }
  }, [handleError])

  // Load leaderboard
  const loadLeaderboard = useCallback(async (clubFilter: 'Sylvan' | '8th' | 'all' = 'all', leaderboardType: 'gross' | 'net' = 'net') => {
    try {
      const leaderboardData = await leaderboardService.getOverallLeaderboard(clubFilter, leaderboardType)
      setLeaderboard(leaderboardData)
    } catch (error) {
      handleError(error, 'loadLeaderboard')
    }
  }, [handleError])

  // Player operations
  const addPlayer = useCallback(async (trackmanId: string, displayName: string, club: 'Sylvan' | '8th') => {
    try {
      const newPlayer = await playerService.create(trackmanId, displayName, club)
      setPlayers(prev => [...prev, newPlayer])
      showNotification(`Player added: ${displayName}`, 'success')
      return newPlayer
    } catch (error) {
      handleError(error, 'addPlayer')
      throw error
    }
  }, [handleError, showNotification])

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<Pick<Player, 'display_name' | 'club'>>) => {
    try {
      const updatedPlayer = await playerService.update(playerId, updates)
      setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p))
      showNotification(`Player updated: ${updatedPlayer.display_name}`, 'success')
      return updatedPlayer
    } catch (error) {
      handleError(error, 'updatePlayer')
      throw error
    }
  }, [handleError, showNotification])

  const deletePlayer = useCallback(async (playerId: string) => {
    try {
      await playerService.delete(playerId)
      setPlayers(prev => prev.filter(p => p.id !== playerId))
      showNotification('Player deleted', 'success')
    } catch (error) {
      handleError(error, 'deletePlayer')
      throw error
    }
  }, [handleError, showNotification])

  const bulkUpsertPlayers = useCallback(async (playersData: Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}>) => {
    try {
      const upsertedPlayers = await playerService.upsertBulk(playersData)
      
      // Update local state by merging upserted players
      setPlayers(prev => {
        const playerMap = new Map(prev.map(p => [p.trackman_id, p]))
        upsertedPlayers.forEach(player => {
          playerMap.set(player.trackman_id, player)
        })
        return Array.from(playerMap.values())
      })
      
      showNotification(`${upsertedPlayers.length} players updated/added from CSV`, 'success')
      return upsertedPlayers
    } catch (error) {
      handleError(error, 'bulkUpsertPlayers')
      throw error
    }
  }, [handleError, showNotification])

  // Tournament operations
  const addTournament = useCallback(async (tournamentData: Omit<Tournament, 'id' | 'created_at'>) => {
    try {
      const newTournament = await tournamentService.create(tournamentData)
      setTournaments(prev => [newTournament, ...prev])
      showNotification(`Tournament created: ${newTournament.name}`, 'success')
      return newTournament
    } catch (error) {
      handleError(error, 'addTournament')
      throw error
    }
  }, [handleError, showNotification])

  // Tournament upload with results
  const uploadTournamentWithResults = useCallback(async (
    tournamentData: Omit<Tournament, 'id' | 'created_at'>,
    playersData: any[]
  ) => {
    setIsLoading(true)
    console.log('🏆 Starting tournament upload:', { tournamentData, playersCount: playersData.length })
    console.log('📋 PLAYER MATCHING DEBUG - First 3 players from upload:', playersData.slice(0, 3).map(p => ({
      playerName: p['Player Name'] || p['Name'] || p.name || p['Player'] || 'Unknown',
      rawData: p
    })))
    
    let tournament: Tournament | null = null
    
    try {
      // Process players and create results first (validate everything)
      const results: Array<Omit<TournamentResult, 'id' | 'created_at' | 'updated_at' | 'tournament_id'> & { directPoints?: boolean }> = []
      
      for (const playerData of playersData) {
        const playerName = playerData['Player Name'] || playerData['Name'] || playerData.name || playerData['Player'] || 'Unknown'
        
        // Get or create player - Player Name field contains trackman_id
        console.log(`🔍 Looking for player with trackman_id: "${playerName}"`);
        console.log(`🔍 Exact string: [${JSON.stringify(playerName)}] Length: ${playerName.length}`);
        let player = await playerService.getByTrackmanId(playerName)
        if (player) {
          console.log(`✅ Found existing player by trackman_id:`, player);
        } else {
          console.log(`❌ No player found with trackman_id: "${playerName}"`);
          // Try exact display name match as fallback
          player = await playerService.getByDisplayName(playerName)
          if (player) {
            console.log(`✅ Found existing player by display_name:`, player);
          } else {
            console.log(`❌ No player found with display_name: "${playerName}"`);
            // Try fuzzy search as fallback
            const searchResults = await playerService.searchByName(playerName)
            if (searchResults.length === 1) {
              // If only one match found, use it
              player = searchResults[0]
              console.log(`✅ Found player via fuzzy search:`, player);
            } else if (searchResults.length > 1) {
              // Multiple matches found - use exact match or first result
              player = searchResults.find(p => p.display_name.toLowerCase() === playerName.toLowerCase()) || searchResults[0]
              console.log(`✅ Found player via multiple fuzzy matches:`, player);
            } else {
              // No matches found - create new player with name as both trackman_id and display_name
              console.warn(`🚨 Creating new player for trackman_id: "${playerName}"`);
              player = await playerService.create(playerName, playerName, 'Sylvan')
              console.log(`✅ Created new player:`, player);
            }
          }
        }
        
        // Validate data before processing
        const grossScore = playerData.gross ?? 0;
        const netScore = playerData.net ?? 0;
        const handicap = playerData.handicap ?? 0;
        
        // Check for direct points (for Points format tournaments)
        const grossPoints = playerData.grossPoints ?? playerData['Gross Points'] ?? playerData.gross_points ?? 0;
        const netPoints = playerData.netPoints ?? playerData['Net Points'] ?? playerData.net_points ?? 0;
        const directPoints = playerData.directPoints || (grossPoints > 0 || netPoints > 0);
        
        console.log('🔍 Player data validation:', {
          playerName,
          gross: playerData.gross,
          net: playerData.net,
          handicap: playerData.handicap,
          grossScore,
          netScore,
          position: playerData.position,
          grossPoints,
          netPoints,
          directPoints,
          format: tournamentData.format,
          rawPlayerData: playerData
        });
        
        // For Points format, allow missing scores if points are provided directly
        if (tournamentData.format !== 'Points' && (grossScore === null || grossScore === undefined || isNaN(grossScore))) {
          console.error('❌ Invalid gross score for player:', playerName, grossScore);
          throw new Error(`Invalid gross score for player ${playerName}: ${grossScore}`);
        }
        
        const resultObject = {
          player_id: player.id,
          gross_position: 999, // Will be calculated after sorting
          net_position: 999,   // Will be calculated after sorting
          gross_score: grossScore,
          net_score: netScore,
          handicap: handicap,
          gross_points: tournamentData.format === 'Points' && directPoints ? grossPoints : 0, // Use direct points for Points format
          net_points: tournamentData.format === 'Points' && directPoints ? netPoints : 0,     // Use direct points for Points format
          tied_players: 1, // Will be calculated in tie handling logic
          directPoints: directPoints // Flag to indicate direct points were provided
        };
        
        console.log('📝 Created result object for', playerName, ':', {
          gross_points: resultObject.gross_points,
          net_points: resultObject.net_points,
          directPoints: resultObject.directPoints,
          originalGrossPoints: grossPoints,
          originalNetPoints: netPoints
        });
        
        results.push(resultObject)
      }
      
      // Helper function to assign positions and handle ties
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
          
          // For Points format (direct points), NEVER calculate points - only assign positions
          if (tournamentData.format === 'Points') {
            console.log('🎯 Preserving direct points for players:', sortedResults.slice(i, i + tiedPlayers).map(r => ({
              player: r.player_id,
              pointsField,
              currentValue: r[pointsField],
              directPoints: r.directPoints
            })));
            // Assign position but keep direct points unchanged
            for (let j = 0; j < tiedPlayers; j++) {
              sortedResults[i + j][positionField] = currentPosition;
              // Don't overwrite the direct points that were already assigned
              sortedResults[i + j].tied_players = tiedPlayers;
            }
          } else {
            console.log('🔢 Calculating points for players:', sortedResults.slice(i, i + tiedPlayers).map(r => ({
              player: r.player_id,
              position: currentPosition,
              tournamentType: tournamentData.type
            })));
            // Calculate total points for tied positions (traditional scoring)
            let totalPoints = 0;
            for (let pos = currentPosition; pos < currentPosition + tiedPlayers; pos++) {
              totalPoints += pointsService.calculatePoints(pos, tournamentData.type);
            }
            const averagePoints = totalPoints / tiedPlayers;
            
            // Assign position and points to all tied players
            for (let j = 0; j < tiedPlayers; j++) {
              sortedResults[i + j][positionField] = currentPosition;
              sortedResults[i + j][pointsField] = averagePoints;
              sortedResults[i + j].tied_players = tiedPlayers;
            }
          }
          
          // Move to next position group
          currentPosition += tiedPlayers;
          i += tiedPlayers;
        }
      };
      
      // Sort by gross scores/points and assign gross positions/points
      console.log('📊 BEFORE GROSS SORTING - Direct points values:', results.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        directPoints: r.directPoints
      })));
      
      let grossSorted;
      let grossSortField;
      if (tournamentData.format === 'Points') {
        // For Points format, sort by points (higher points = better position)
        grossSorted = [...results].sort((a, b) => b.gross_points - a.gross_points);
        grossSortField = 'gross_points';
      } else {
        // For Stableford, higher scores are better (descending sort), for stroke play lower scores are better (ascending sort)
        grossSorted = [...results].sort((a, b) => 
          tournamentData.format === 'Stableford' ? b.gross_score - a.gross_score : a.gross_score - b.gross_score
        );
        grossSortField = 'gross_score';
      }
      
      console.log('📊 AFTER GROSS SORTING - Direct points values:', grossSorted.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        directPoints: r.directPoints
      })));
      
      assignPositionsWithTies(grossSorted, grossSortField, 'gross_position', 'gross_points');
      
      console.log('📊 AFTER GROSS POSITION ASSIGNMENT - Direct points values:', grossSorted.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        gross_position: r.gross_position,
        directPoints: r.directPoints
      })));
      
      // Sort by net scores/points and assign net positions/points
      console.log('📊 BEFORE NET SORTING - Direct points values:', results.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        directPoints: r.directPoints
      })));
      
      let netSorted;
      let netSortField;
      if (tournamentData.format === 'Points') {
        // For Points format, sort by points (higher points = better position)
        netSorted = [...results].sort((a, b) => b.net_points - a.net_points);
        netSortField = 'net_points';
      } else {
        // For Stableford, higher scores are better (descending sort), for stroke play lower scores are better (ascending sort)
        netSorted = [...results].sort((a, b) => 
          tournamentData.format === 'Stableford' ? b.net_score - a.net_score : a.net_score - b.net_score
        );
        netSortField = 'net_score';
      }
      
      console.log('📊 AFTER NET SORTING - Direct points values:', netSorted.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        directPoints: r.directPoints
      })));
      
      assignPositionsWithTies(netSorted, netSortField, 'net_position', 'net_points');
      
      console.log('📊 AFTER NET POSITION ASSIGNMENT - Direct points values:', netSorted.filter(r => r.directPoints).map(r => ({
        player: r.player_id,
        gross_points: r.gross_points,
        net_points: r.net_points,
        net_position: r.net_position,
        directPoints: r.directPoints
      })));
      
      // Only create tournament after validation succeeds
      console.log('📝 Creating tournament in database...')
      tournament = await tournamentService.create(tournamentData)
      console.log('✅ Tournament created:', tournament)
      
      // Add tournament_id to all results and clean up temporary fields
      const resultsWithTournamentId = results.map(result => {
        const { directPoints, ...cleanResult } = result;
        return {
          ...cleanResult,
          tournament_id: tournament!.id
        };
      });
      
      // Bulk insert results
      console.log('💾 Saving tournament results to database:', resultsWithTournamentId.length, 'results')
      await tournamentResultService.createBulk(resultsWithTournamentId)
      console.log('✅ Tournament results saved')
      
      // Update local state
      setTournaments(prev => [tournament!, ...prev])
      console.log('🔄 Local state updated')
      
      // Reload leaderboard (both gross and net will be available now)
      console.log('📊 Reloading leaderboard...')
      await loadLeaderboard('all', 'net') // Default to net leaderboard
      console.log('✅ Leaderboard reloaded')
      
      showNotification(`Tournament "${tournament.name}" uploaded successfully!`, 'success')
      return tournament
    } catch (error) {
      console.error('❌ Tournament upload failed:', error)
      console.error('Error details:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      })
      
      // If tournament was created but results failed, clean up the tournament
      if (tournament) {
        console.log('🧹 Cleaning up orphaned tournament...')
        try {
          await tournamentService.delete(tournament.id)
          console.log('✅ Orphaned tournament cleaned up')
        } catch (cleanupError) {
          console.error('❌ Failed to clean up orphaned tournament:', cleanupError)
        }
      }
      
      handleError(error, 'uploadTournamentWithResults')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [handleError, showNotification, loadLeaderboard])

  // Get tournament results
  const getTournamentResults = useCallback(async (tournamentId: string): Promise<TournamentResult[]> => {
    try {
      return await tournamentResultService.getByTournament(tournamentId)
    } catch (error) {
      handleError(error, 'getTournamentResults')
      return []
    }
  }, [handleError])

  // Get player details with all tournament results
  const getPlayerDetails = useCallback(async (playerId: string): Promise<TournamentResult[]> => {
    try {
      return await tournamentResultService.getByPlayer(playerId)
    } catch (error) {
      handleError(error, 'getPlayerDetails')
      return []
    }
  }, [handleError])

  // Delete tournament and its results
  const deleteTournament = useCallback(async (tournamentId: string) => {
    try {
      // First delete all tournament results
      await tournamentResultService.deleteByTournament(tournamentId)
      
      // Then delete the tournament
      await tournamentService.delete(tournamentId)
      
      // Update local state
      setTournaments(prev => prev.filter(t => t.id !== tournamentId))
      
      // Reload leaderboard since data has changed
      await loadLeaderboard()
      
      showNotification('Tournament deleted successfully', 'success')
    } catch (error) {
      handleError(error, 'deleteTournament')
      throw error
    }
  }, [handleError, showNotification, loadLeaderboard])

  // Initialize data on mount
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Load initial leaderboard
  useEffect(() => {
    if (tournaments.length > 0) {
      loadLeaderboard()
    }
  }, [tournaments.length, loadLeaderboard])

  return {
    // Data
    players,
    tournaments,
    leaderboard,
    
    // States
    isLoading,
    error,
    notification,
    
    // Methods
    showNotification,
    loadLeaderboard,
    addPlayer,
    updatePlayer,
    deletePlayer,
    bulkUpsertPlayers,
    addTournament,
    deleteTournament,
    uploadTournamentWithResults,
    getTournamentResults,
    getPlayerDetails,
    
    // Reload data
    reload: loadInitialData
  }
}