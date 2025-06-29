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
  const loadLeaderboard = useCallback(async (clubFilter: 'Sylvan' | '8th' | 'all' = 'all') => {
    try {
      const leaderboardData = await leaderboardService.getOverallLeaderboard(clubFilter)
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
    
    try {
      // Create tournament
      const tournament = await tournamentService.create(tournamentData)
      
      // Process players and create results
      const results: Omit<TournamentResult, 'id' | 'created_at' | 'updated_at'>[] = []
      
      for (const playerData of playersData) {
        const trackmanId = playerData['Player Name'] || playerData['Name'] || playerData.name || playerData['Player'] || 'Unknown'
        
        // Get or create player
        let player = await playerService.getByTrackmanId(trackmanId)
        if (!player) {
          // Create new player with fallback data
          const fallbackName = trackmanId
          player = await playerService.create(trackmanId, fallbackName, 'Sylvan')
        }
        
        // Calculate points
        const points = pointsService.calculatePoints(playerData.position, tournamentData.type)
        
        results.push({
          tournament_id: tournament.id,
          player_id: player.id,
          position: playerData.position,
          gross_score: playerData.gross,
          net_score: playerData.net,
          handicap: playerData.handicap,
          points: points,
          tied_players: playerData.tied || 1
        })
      }
      
      // Bulk insert results
      await tournamentResultService.createBulk(results)
      
      // Update local state
      setTournaments(prev => [tournament, ...prev])
      
      // Reload leaderboard
      await loadLeaderboard()
      
      showNotification(`Tournament "${tournament.name}" uploaded successfully!`, 'success')
      return tournament
    } catch (error) {
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
    addTournament,
    uploadTournamentWithResults,
    getTournamentResults,
    getPlayerDetails,
    
    // Reload data
    reload: loadInitialData
  }
}