import { useState, useEffect } from 'react';
import { Upload, Trophy, Calendar, Users, TrendingUp, Star, Target, ChevronDown, X, Lock, FileSpreadsheet, FileText, Sparkles, Settings, Trash2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useSupabaseData } from './hooks/useSupabaseData';




interface ScheduleEvent {
  date: string;
  name: string;
  type: string;
  venue?: string;
  subtitle?: string;
}

const GolfTournamentSystem = () => {
  // Supabase data and operations
  const {
    players: supabasePlayers,
    tournaments: supabaseTournaments,
    leaderboard: supabaseLeaderboard,
    notification: supabaseNotification,
    showNotification,
    addPlayer,
    updatePlayer,
    deletePlayer,
    bulkUpsertPlayers,
    uploadTournamentWithResults,
    deleteTournament,
    getTournamentResults,
    loadLeaderboard
  } = useSupabaseData();

  // Player mappings now handled by Supabase - use supabasePlayers instead

  // UI state
  const [selectedTournament, setSelectedTournament] = useState('');
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [leaderboardType, setLeaderboardType] = useState('net');
  const [tournamentLeaderboardType, setTournamentLeaderboardType] = useState('net');
  const [showUpload, setShowUpload] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedClub, setSelectedClub] = useState('all');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [uploadData, setUploadData] = useState({
    name: '',
    date: '',
    type: 'Tour Event',
    format: 'Stroke Play',
    par: 72,
    csvData: '',
    uploadMethod: 'csv'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  const [newMapping, setNewMapping] = useState({ trackmanId: '', name: '', club: 'Sylvan' });
  const [newPlayersFound, setNewPlayersFound] = useState<Array<{trackmanId: string, suggestedName: string, club: 'Sylvan' | '8th'}>>([]);
  const [showNewPlayersModal, setShowNewPlayersModal] = useState(false);
  const [pendingTournamentData, setPendingTournamentData] = useState<any>(null);
  
  // CSV Upload state
  const [csvData, setCsvData] = useState<Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}>>([]);
  const [csvPreview, setCsvPreview] = useState<Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}>>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  // Use Supabase notification system
  const notification = supabaseNotification;

  // Handle opening player details modal
  const handlePlayerClick = (player: any) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  // Functions to manage Trackman mappings using Supabase
  const addMapping = async () => {
    if (newMapping.trackmanId.trim() && newMapping.name.trim()) {
      try {
        await addPlayer(newMapping.trackmanId.trim(), newMapping.name.trim(), newMapping.club as 'Sylvan' | '8th');
        setNewMapping({ trackmanId: '', name: '', club: 'Sylvan' });
      } catch (error) {
        // Error already handled by the hook
      }
    }
  };

  const deleteMapping = async (playerId: string) => {
    try {
      await deletePlayer(playerId);
    } catch (error) {
      // Error already handled by the hook
    }
  };

  const updateMapping = async (playerId: string, newName: string, newClub: string) => {
    try {
      await updatePlayer(playerId, { 
        display_name: newName, 
        club: newClub as 'Sylvan' | '8th' 
      });
    } catch (error) {
      // Error already handled by the hook
    }
  };

  // CSV Upload Functions
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      parseCsvFile(file);
    } else {
      showNotification('Please select a valid CSV file', 'error');
    }
  };

  const parseCsvFile = (file: File) => {
    setCsvLoading(true);
    setCsvErrors([]);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const validData: Array<{trackman_id: string, display_name: string, club: 'Sylvan' | '8th'}> = [];
        
        // Check for required headers
        const requiredHeaders = ['trackman_id', 'display_name', 'club'];
        const headers = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        
        if (missingHeaders.length > 0) {
          errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
        } else {
          // Validate each row
          results.data.forEach((row: any, index: number) => {
            const rowNum = index + 2; // +2 because index starts at 0 and we have headers
            
            if (!row.trackman_id?.trim()) {
              errors.push(`Row ${rowNum}: trackman_id is required`);
            }
            if (!row.display_name?.trim()) {
              errors.push(`Row ${rowNum}: display_name is required`);
            }
            if (!row.club?.trim()) {
              errors.push(`Row ${rowNum}: club is required`);
            } else if (row.club !== 'Sylvan' && row.club !== '8th') {
              errors.push(`Row ${rowNum}: club must be either 'Sylvan' or '8th', got '${row.club}'`);
            }
            
            // If row is valid, add to validData
            if (row.trackman_id?.trim() && row.display_name?.trim() && 
                (row.club === 'Sylvan' || row.club === '8th')) {
              validData.push({
                trackman_id: row.trackman_id.trim(),
                display_name: row.display_name.trim(),
                club: row.club as 'Sylvan' | '8th'
              });
            }
          });
        }
        
        setCsvErrors(errors);
        setCsvData(validData);
        setCsvPreview(validData.slice(0, 10)); // Show first 10 rows as preview
        setShowCsvPreview(validData.length > 0);
        setCsvLoading(false);
        
        if (errors.length > 0) {
          showNotification(`CSV parsing completed with ${errors.length} error(s)`, 'error');
        } else {
          showNotification(`CSV parsed successfully: ${validData.length} valid records found`, 'success');
        }
      },
      error: (error) => {
        setCsvLoading(false);
        setCsvErrors([`Failed to parse CSV: ${error.message}`]);
        showNotification('Failed to parse CSV file', 'error');
      }
    });
  };

  const uploadCsvData = async () => {
    if (csvData.length === 0) {
      showNotification('No valid data to upload', 'error');
      return;
    }
    
    setCsvLoading(true);
    try {
      await bulkUpsertPlayers(csvData);
      // Reset CSV state after successful upload
      setCsvData([]);
      setCsvPreview([]);
      setCsvErrors([]);
      setShowCsvPreview(false);
      // Clear file input
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      // Error already handled by the hook
    } finally {
      setCsvLoading(false);
    }
  };

  const clearCsvData = () => {
    setCsvData([]);
    setCsvPreview([]);
    setCsvErrors([]);
    setShowCsvPreview(false);
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Function to get player info from Trackman ID using Supabase
  const getPlayerFromTrackmanId = (trackmanId: string): {name: string, club: string} => {
    const player = supabasePlayers.find(p => p.trackman_id === trackmanId);
    if (player) {
      return { name: player.display_name, club: player.club };
    }
    // Fallback: use the trackmanId as the name if no mapping exists
    return { name: trackmanId, club: 'Unknown' };
  };

  // Function to detect new players in uploaded tournament data
  const detectNewPlayers = (players: any[]): Array<{trackmanId: string, suggestedName: string, club: 'Sylvan' | '8th'}> => {
    const newPlayers: Array<{trackmanId: string, suggestedName: string, club: 'Sylvan' | '8th'}> = [];
    
    players.forEach(player => {
      const trackmanId = player['Player Name'] || player['Name'] || player.name || player['Player'] || 'Unknown';
      
      // Skip if trackmanId is 'Unknown' or empty
      if (!trackmanId || trackmanId === 'Unknown') return;
      
      // Check if player already exists in Supabase
      const existingPlayer = supabasePlayers.find(p => p.trackman_id === trackmanId);
      
      if (!existingPlayer) {
        // This is a new player - add to list if not already there
        const alreadyFound = newPlayers.some(np => np.trackmanId === trackmanId);
        if (!alreadyFound) {
          newPlayers.push({
            trackmanId: trackmanId,
            suggestedName: trackmanId, // Use trackmanId as suggested display name
            club: 'Sylvan' // Default to Sylvan, admin can change in modal
          });
        }
      }
    });
    
    return newPlayers;
  };

  // Function to handle new players modal confirmation
  const handleNewPlayersConfirm = async () => {
    try {
      // Add all new players to database
      for (const newPlayer of newPlayersFound) {
        await addPlayer(newPlayer.trackmanId, newPlayer.suggestedName, newPlayer.club);
      }
      
      // Close modal and proceed with tournament upload
      setShowNewPlayersModal(false);
      setNewPlayersFound([]);
      
      // Process the pending tournament now that players are added
      if (pendingTournamentData) {
        await processTournamentUpload(pendingTournamentData);
        setPendingTournamentData(null);
      }
    } catch (error) {
      console.error('Error adding new players:', error);
    }
  };

  // Function to cancel new players modal
  const handleNewPlayersCancel = () => {
    setShowNewPlayersModal(false);
    setNewPlayersFound([]);
    setPendingTournamentData(null);
    setIsLoading(false);
  };

  // Function to determine event status based on current date
  const getEventStatus = (dateString: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    // Parse different date formats
    const parseDate = (dateStr: string): { start: Date; end: Date } => {
      const currentYear = new Date().getFullYear();
      
      // Handle range formats like "June 5–15", "July 27–Aug 2"
      if (dateStr.includes('–')) {
        const [startStr, endStr] = dateStr.split('–');
        
        // Handle cross-month ranges like "July 27–Aug 2"
        if (endStr.includes(' ')) {
          const [endMonth, endDay] = endStr.trim().split(' ');
          const startDate = new Date(`${startStr.trim()} ${currentYear}`);
          const endDate = new Date(`${endMonth} ${endDay} ${currentYear}`);
          return { start: startDate, end: endDate };
        } else {
          // Same month range like "June 5–15"
          const startDate = new Date(`${startStr.trim()} ${currentYear}`);
          const monthMatch = startStr.match(/^([A-Za-z]+)/);
          const month = monthMatch ? monthMatch[1] : '';
          const endDate = new Date(`${month} ${endStr.trim()} ${currentYear}`);
          return { start: startDate, end: endDate };
        }
      } else {
        // Single date like "June 12"
        const singleDate = new Date(`${dateStr} ${currentYear}`);
        return { start: singleDate, end: singleDate };
      }
    };

    try {
      const { start, end } = parseDate(dateString);
      
      if (today < start) {
        return 'upcoming';
      } else if (today >= start && today <= end) {
        return 'live';
      } else {
        return 'completed';
      }
    } catch (error) {
      // Fallback to upcoming if parsing fails
      return 'upcoming';
    }
  };

  // Schedule data
  const schedule: Record<string, ScheduleEvent[]> = {
    'MAY': [
      { date: 'June 5–15', name: 'U.S. Open', type: 'Major' },
      { date: 'June 12', name: 'Supr Club #2', type: 'SUPR', venue: 'Outdoor' },
      { date: 'June 22–28', name: 'Indoor Tournament', type: 'Tour Event' },
      { date: 'June 26', name: 'League Night #2', type: 'League' }
    ],
    'JUNE': [
      { date: 'July 10–20', name: 'Open Championship', type: 'Major' },
      { date: 'July 10', name: 'Supr Club #3', type: 'SUPR', venue: 'Outdoor' },
      { date: 'July 24', name: 'League Night #3', type: 'League' },
      { date: 'July 27–Aug 2', name: 'Indoor Tournament', type: 'Tour Event' }
    ],
    'JULY': [
      { date: 'Aug 7', name: 'The Players', type: 'Major' },
      { date: 'Aug 10–16', name: 'Indoor Tournament', type: 'Tour Event' },
      { date: 'Aug 21', name: 'League Night #4', type: 'League' },
      { date: 'Aug 24–30', name: 'Indoor Tournament', type: 'Tour Event' }
    ],
    'AUG': [
      { date: 'Sept 4', name: 'Supr Club #5', type: 'SUPR', venue: 'Outdoor' },
      { date: 'Sept 7–13', name: 'Founders Cup', type: 'Tour Event', subtitle: 'Ryder Cup Team Event' },
      { date: 'Sept 18', name: 'League Night #5', type: 'League' },
      { date: 'Sept 21–27', name: 'Indoor Tournament', type: 'Tour Event' }
    ],
    'SEPT': [
      { date: 'Oct 2', name: 'Supr Club #6', type: 'SUPR', venue: 'Outdoor' },
      { date: 'Oct 7', name: 'League Night #6', type: 'League' },
      { date: 'Oct 10', name: 'Playoff', type: 'Major', subtitle: 'Top 6 competitors' }
    ]
  };

  // Points system based on tournament type
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
  };

  // Calculate remaining possible points for each tournament type
  const calculateRemainingPoints = () => {
    const remainingEvents = {
      'Major': 0,
      'Tour Event': 0,
      'League': 0,
      'SUPR': 0
    };

    Object.values(schedule).flat().forEach((event: ScheduleEvent) => {
      const status = getEventStatus(event.date);
      if (status === 'upcoming') {
        remainingEvents[event.type as keyof typeof remainingEvents]++;
      }
    });

    // Maximum points possible from first place in each tournament type
    const maxPoints = {
      'Major': pointsSystem['Major'][1],
      'Tour Event': pointsSystem['Tour Event'][1],
      'League': pointsSystem['League'][1],
      'SUPR': pointsSystem['SUPR'][1]
    };

    return {
      total: remainingEvents['Major'] * maxPoints['Major'] + 
             remainingEvents['Tour Event'] * maxPoints['Tour Event'] + 
             remainingEvents['League'] * maxPoints['League'] + 
             remainingEvents['SUPR'] * maxPoints['SUPR'],
      byType: remainingEvents
    };
  };

  // Check if player has secured playoff spot
  const isPlayoffQualified = (player: any, leaderboard: any) => {
    const remaining = calculateRemainingPoints();
    const clubPlayers = leaderboard.filter((p: any) => p.club === player.club);
    const playerRankInClub = clubPlayers.findIndex((p: any) => p.name === player.name) + 1;
    
    if (playerRankInClub <= 4) {
      // Player is currently in top 4 for their club
      const fifthPlaceInClub = clubPlayers[4];
      if (!fifthPlaceInClub) return true; // Less than 5 players in club
      
      const pointsGap = player.totalPoints - fifthPlaceInClub.totalPoints;
      // If current lead is greater than maximum possible remaining points, they're qualified
      return pointsGap > remaining.total;
    }
    
    return false;
  };

  const handleLogin = () => {
    if (loginData.username === 'admin' && loginData.password === 'golf2025') {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
      showNotification('Admin access granted!', 'success');
    } else {
      showNotification('Invalid credentials. Use username: admin, password: golf2025', 'error');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setShowUpload(false);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const player: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        player[header] = values[index] || '';
      });
      return player;
    });
  };

  const parseXLSX = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Empty spreadsheet'));
            return;
          }
          
          const headers = (jsonData[0] as any[]).map((h: any) => h ? h.toString().trim() : '');
          const players = (jsonData.slice(1) as any[][]).map(row => {
            const player: { [key: string]: string } = {};
            headers.forEach((header: string, index: number) => {
              player[header] = row[index] ? row[index].toString().trim() : '';
            });
            return player;
          }).filter(player => {
            return Object.values(player).some((value: string) => value !== '');
          });
          
          resolve(players);
        } catch (error) {
          reject(error as Error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // SUPR-specific parsing functions for flexible formats
  const parseSuprCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const player = parseSuprPlayerData(headers, values, index + 1);
      return player;
    }).filter(player => player !== null);
  };

  const parseSuprXLSX = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Empty spreadsheet'));
            return;
          }
          
          const headers = (jsonData[0] as any[]).map((h: any) => 
            h ? h.toString().trim().toLowerCase() : ''
          );
          
          const players = (jsonData.slice(1) as any[][]).map((row, index) => {
            const values = row.map(cell => cell ? cell.toString().trim() : '');
            return parseSuprPlayerData(headers, values, index + 1);
          }).filter(player => player !== null);
          
          resolve(players);
        } catch (error) {
          reject(error as Error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Flexible parser for SUPR player data that handles various column formats
  const parseSuprPlayerData = (headers: string[], values: string[], rowIndex: number) => {
    // Skip empty rows
    if (values.every(v => !v || v.trim() === '')) {
      return null;
    }

    // Initialize player data with defaults
    let playerName = '';
    let score = 0;
    let position = rowIndex; // Default to row number if no position found
    
    // Try to find player name in various column formats
    const namePatterns = [
      'name', 'player name', 'player', 'display name', 'full name', 
      'first name', 'last name', 'participant', 'golfer'
    ];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = values[i] || '';
      
      // Look for name columns
      if (namePatterns.some(pattern => header.includes(pattern))) {
        if (value && !playerName) {
          playerName = value;
        }
      }
      
      // Look for score columns
      const scorePatterns = [
        'score', 'total', 'points', 'final score', 'net', 'gross', 'result'
      ];
      if (scorePatterns.some(pattern => header.includes(pattern))) {
        const parsedScore = parseFloat(value);
        if (!isNaN(parsedScore)) {
          score = parsedScore;
        }
      }
      
      // Look for position/place columns
      const positionPatterns = [
        'position', 'place', 'rank', 'pos', 'placement', 'finish'
      ];
      if (positionPatterns.some(pattern => header.includes(pattern))) {
        const parsedPosition = parseInt(value);
        if (!isNaN(parsedPosition)) {
          position = parsedPosition;
        }
      }
    }
    
    // If no name found in headers, try to guess from values
    if (!playerName) {
      // Look for the first non-numeric value that's not a position
      for (let i = 0; i < values.length; i++) {
        const value = values[i] || '';
        // Check if it's a likely name (not a number and reasonable length)
        if (value && 
            isNaN(parseFloat(value)) && 
            value.length > 1 && 
            value.length < 50 && // Reasonable name length
            !/^\d+$/.test(value.trim())) { // Not just digits
          playerName = value;
          break;
        }
      }
    }
    
    // Additional cleanup for player names
    if (playerName) {
      // Remove common prefixes/suffixes and clean up
      playerName = playerName
        .replace(/^(player|participant|golfer)\s*/i, '') // Remove common prefixes
        .replace(/\s*(score|points|total)$/i, '') // Remove score-related suffixes
        .trim();
    }
    
    // Fallback: if still no name, use a default
    if (!playerName) {
      playerName = `Player ${rowIndex}`;
    }
    
    // Return standardized player object for SUPR events
    return {
      'Player Name': playerName,
      'Score': score.toString(),
      'Position': position.toString(),
      'Course Handicap': '0', // Default handicap for SUPR
      'Club': 'Unknown' // Will be determined by player mapping or set during processing
    };
  };

  // League-specific parsing functions for flexible formats (similar to SUPR)
  const parseLeagueCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const player = parseLeaguePlayerData(headers, values, index + 1);
      return player;
    }).filter(player => player !== null);
  };

  const parseLeagueXLSX = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Empty spreadsheet'));
            return;
          }
          
          const headers = (jsonData[0] as any[]).map((h: any) => 
            h ? h.toString().trim().toLowerCase() : ''
          );
          
          const players = (jsonData.slice(1) as any[][]).map((row, index) => {
            const values = row.map(cell => cell ? cell.toString().trim() : '');
            return parseLeaguePlayerData(headers, values, index + 1);
          }).filter(player => player !== null);
          
          resolve(players);
        } catch (error) {
          reject(error as Error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Flexible parser for League player data that handles various column formats
  const parseLeaguePlayerData = (headers: string[], values: string[], rowIndex: number) => {
    // Skip empty rows
    if (values.every(v => !v || v.trim() === '')) {
      return null;
    }

    // Initialize player data with defaults
    let playerName = '';
    let score = 0;
    let position = rowIndex; // Default to row number if no position found
    
    // Try to find player name in various column formats
    const namePatterns = [
      'name', 'player name', 'player', 'display name', 'full name', 
      'first name', 'last name', 'participant', 'golfer', 'member'
    ];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = values[i] || '';
      
      // Look for name columns
      if (namePatterns.some(pattern => header.includes(pattern))) {
        if (value && !playerName) {
          playerName = value;
        }
      }
      
      // Look for score columns (League events often use different scoring terms)
      const scorePatterns = [
        'score', 'total', 'points', 'final score', 'net', 'gross', 'result',
        'league score', 'weekly score', 'round score'
      ];
      if (scorePatterns.some(pattern => header.includes(pattern))) {
        const parsedScore = parseFloat(value);
        if (!isNaN(parsedScore)) {
          score = parsedScore;
        }
      }
      
      // Look for position/place columns
      const positionPatterns = [
        'position', 'place', 'rank', 'pos', 'placement', 'finish',
        'league position', 'weekly rank'
      ];
      if (positionPatterns.some(pattern => header.includes(pattern))) {
        const parsedPosition = parseInt(value);
        if (!isNaN(parsedPosition)) {
          position = parsedPosition;
        }
      }
    }
    
    // If no name found in headers, try to guess from values
    if (!playerName) {
      // Look for the first non-numeric value that's not a position
      for (let i = 0; i < values.length; i++) {
        const value = values[i] || '';
        // Check if it's a likely name (not a number and reasonable length)
        if (value && 
            isNaN(parseFloat(value)) && 
            value.length > 1 && 
            value.length < 50 && // Reasonable name length
            !/^\d+$/.test(value.trim())) { // Not just digits
          playerName = value;
          break;
        }
      }
    }
    
    // Additional cleanup for player names
    if (playerName) {
      // Remove common prefixes/suffixes and clean up
      playerName = playerName
        .replace(/^(player|participant|golfer|member)\s*/i, '') // Remove common prefixes
        .replace(/\s*(score|points|total|league)$/i, '') // Remove score-related suffixes
        .trim();
    }
    
    // Fallback: if still no name, use a default
    if (!playerName) {
      playerName = `Player ${rowIndex}`;
    }
    
    // Return standardized player object for League events
    return {
      'Player Name': playerName,
      'Score': score.toString(),
      'Position': position.toString(),
      'Course Handicap': '0', // Default handicap for League events
      'Club': 'Unknown' // Will be determined by player mapping or set during processing
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'xlsx' || extension === 'xls') {
        setUploadData({...uploadData, uploadMethod: 'file'});
      } else if (extension === 'csv') {
        setUploadData({...uploadData, uploadMethod: 'file'});
      }
    }
  };



  const handleUpload = async () => {
    if (!uploadData.name || !uploadData.date) {
      showNotification('Please fill in tournament name and date', 'error');
      return;
    }

    setIsLoading(true);

    let players: any[] = [];

    try {
      if (uploadData.uploadMethod === 'file' && selectedFile) {
        const extension = selectedFile.name.toLowerCase().split('.').pop();
        
        if (extension === 'xlsx' || extension === 'xls') {
          // Use flexible parsing for SUPR and League events, standard parsing for others
          if (uploadData.type === 'SUPR') {
            players = await parseSuprXLSX(selectedFile);
          } else if (uploadData.type === 'League') {
            players = await parseLeagueXLSX(selectedFile);
          } else {
            players = await parseXLSX(selectedFile);
          }
        } else if (extension === 'csv') {
          const csvText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target && typeof e.target.result === 'string') {
                resolve(e.target.result);
              } else {
                reject(new Error('Failed to read file as text'));
              }
            };
            reader.onerror = () => reject(new Error('Failed to read CSV file'));
            reader.readAsText(selectedFile);
          });
          // Use flexible parsing for SUPR and League events, standard parsing for others
          if (uploadData.type === 'SUPR') {
            players = parseSuprCSV(csvText);
          } else if (uploadData.type === 'League') {
            players = parseLeagueCSV(csvText);
          } else {
            players = parseCSV(csvText);
          }
        } else {
          showNotification('Please select a CSV or Excel (.xlsx) file', 'error');
          setIsLoading(false);
          return;
        }
      } else if (uploadData.uploadMethod === 'csv' && uploadData.csvData) {
        // Use flexible parsing for SUPR and League events, standard parsing for others
        if (uploadData.type === 'SUPR') {
          players = parseSuprCSV(uploadData.csvData);
        } else if (uploadData.type === 'League') {
          players = parseLeagueCSV(uploadData.csvData);
        } else {
          players = parseCSV(uploadData.csvData);
        }
      } else {
        showNotification('Please provide data via file upload or CSV text', 'error');
        setIsLoading(false);
        return;
      }

      if (players.length === 0) {
        showNotification('No valid player data found', 'error');
        setIsLoading(false);
        return;
      }

    } catch (error) {
      showNotification(`Error processing file: ${(error as Error).message}`, 'error');
      setIsLoading(false);
      return;
    }

    // Check for new players before processing
    const newPlayers = detectNewPlayers(players);
    
    if (newPlayers.length > 0) {
      // Store tournament data and show new players modal
      setPendingTournamentData({ players, uploadData: { ...uploadData } });
      setNewPlayersFound(newPlayers);
      setShowNewPlayersModal(true);
      // Keep loading state - will be cleared when modal is handled
      return;
    }

    // No new players found, proceed with upload
    await processTournamentUpload({ players, uploadData: { ...uploadData } });
  };

  // Function to process tournament upload after new players are handled
  const processTournamentUpload = async (data: { players: any[], uploadData: any }) => {
    const { players, uploadData: tournamentData } = data;
    
    try {
      setIsLoading(true);
      
      // Process players data for Supabase upload
      const processedPlayers = players.filter((player) => {
        // Skip players with N/A scores
        const score = player['Score'] || player['Net'] || player.net || player['Net Score'] || player['Total'] || player.total || player['Points'] || player.points;
        return score !== 'N/A' && score !== 'n/a' && score !== 'NA' && score !== null && score !== undefined && score !== '';
      }).map((player, index) => {
        const courseHandicap = parseFloat(player['Course Handicap'] || player['Handicap'] || player.handicap || player['HCP'] || '0') || 0;
        
        // Try to get player info from Trackman mappings first, then fall back to provided data
        const trackmanId = player['Player Name'] || player['Name'] || player.name || player['Player'] || 'Unknown';
        const playerInfo = getPlayerFromTrackmanId(trackmanId);
        
        if (tournamentData.format === 'Stableford') {
          const netStableford = parseInt(player['Total'] || player.total || player['Points'] || player.points || '0') || 0;
          const grossStableford = netStableford - courseHandicap;
          
          return {
            'Player Name': trackmanId,
            name: playerInfo.name,
            net: netStableford,
            gross: grossStableford,
            handicap: courseHandicap,
            position: index + 1 // Will be recalculated in the service
          };
        } else {
          // Score is relative to par (e.g., +2, 0, -2)
          const scoreRelativeToPar = parseInt(player['Score'] || player['Net'] || player.net || player['Net Score'] || '0') || 0;
          const par = tournamentData.par || 72;
          
          // Convert to actual stroke scores
          const netScore = par + scoreRelativeToPar; // Net score (par + relative score)
          const grossScore = netScore + courseHandicap; // Gross score (net + handicap)
          
          // Debug logging for problematic players
          if (isNaN(grossScore) || isNaN(netScore)) {
            console.error('❌ Score calculation error for player:', {
              trackmanId,
              scoreRelativeToPar,
              par,
              courseHandicap,
              netScore,
              grossScore,
              originalData: player
            });
          }
          
          return {
            'Player Name': trackmanId,
            name: playerInfo.name,
            net: isNaN(netScore) ? 72 : netScore,
            gross: isNaN(grossScore) ? 72 : grossScore,
            handicap: isNaN(courseHandicap) ? 0 : courseHandicap,
            position: index + 1 // Will be recalculated in the service
          };
        }
      });

      // Debug: Log processed players data
      console.log('📊 Processed players data:', processedPlayers.map(p => ({
        name: p.name,
        net: p.net,
        gross: p.gross,
        handicap: p.handicap
      })));

      // Use Supabase service to upload tournament with results
      await uploadTournamentWithResults(
        {
          name: tournamentData.name,
          date: tournamentData.date,
          type: tournamentData.type as 'Major' | 'Tour Event' | 'League' | 'SUPR',
          format: tournamentData.format as 'Stroke Play' | 'Stableford'
        },
        processedPlayers
      );

      // Reset form and close modal
      setUploadData({ name: '', date: '', type: 'Tour Event', format: 'Stroke Play', par: 72, csvData: '', uploadMethod: 'csv' });
      setSelectedFile(null);
      setShowUpload(false);
      
    } catch (error) {
      console.error('Error uploading tournament:', error);
      showNotification('Failed to upload tournament. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get filtered leaderboard data from Supabase and adapt for UI
  const getFilteredLeaderboard = () => {
    if (!supabaseLeaderboard) return [];
    
    // Filter by club if needed
    let filteredData = supabaseLeaderboard;
    if (selectedClub !== 'all') {
      filteredData = supabaseLeaderboard.filter(player => player.club === selectedClub);
    }
    
    // Adapt field names for UI compatibility
    return filteredData.map(player => ({
      ...player,
      name: player.display_name, // Map display_name to name for UI
      totalPoints: player.total_points,
      countingEvents: player.counting_events,
      totalEvents: player.total_events,
      avgGross: player.avg_gross,
      avgNet: player.avg_net,
      bestFinish: player.best_finish,
      allEvents: player.all_events
    }));
  };

  // Load leaderboard when club filter or leaderboard type changes
  useEffect(() => {
    loadLeaderboard(
      selectedClub === 'all' ? 'all' : selectedClub as 'Sylvan' | '8th',
      leaderboardType as 'gross' | 'net'
    );
  }, [selectedClub, leaderboardType, loadLeaderboard]);

  const selectedTournamentData = supabaseTournaments.find(t => t.id === selectedTournament);

  // Load tournament results when a tournament is selected
  useEffect(() => {
    if (selectedTournament && selectedTournamentData) {
      getTournamentResults(selectedTournament).then(results => {
        setTournamentResults(results);
      });
    } else {
      setTournamentResults([]);
    }
  }, [selectedTournament, selectedTournamentData, getTournamentResults]);

  const getRankIcon = () => {
    // No icons for playoff-style leaderboard
    return null;
  };

  const getPositionBadge = (position: number, isTournament: boolean = false) => {
    if (isTournament && position <= 4) return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50';
    if (position <= 10) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/50';
    return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/50';
  };

  const getTournamentTypeColor = (type: string) => {
    switch (type) {
      case 'Major': return 'from-purple-600 to-pink-600';
      case 'Tour Event': return 'from-blue-600 to-cyan-600';
      case 'League': return 'from-green-600 to-emerald-600';
      case 'SUPR': return 'from-orange-600 to-red-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-1/6 right-1/3 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-2xl backdrop-blur-sm transform transition-all duration-300 animate-in slide-in-from-right ${
          notification.type === 'success' 
            ? 'bg-green-500/90 border border-green-400/50 text-white' 
            : 'bg-red-500/90 border border-red-400/50 text-white'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <Sparkles className="text-white" size={20} />
            ) : (
              <X className="text-white" size={20} />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full mb-4 shadow-2xl">
                <Trophy className="text-white" size={40} />
              </div>
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 animate-in fade-in-0 duration-1000">
              The Founders Series
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed animate-in fade-in-0 duration-1000 delay-300">
              A summer long race to the championship and a chance for members to compete, play, hangout, and win.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mb-8 justify-center animate-in fade-in-0 duration-1000 delay-500">
            <button
              onClick={() => setActiveTab('about')}
              className={`group px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'about'
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-2xl shadow-emerald-500/25'
                  : 'bg-slate-800 backdrop-blur-sm text-slate-100 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <FileText className="inline mr-3" size={24} />
              About
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`group px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-2xl shadow-emerald-500/25'
                  : 'bg-slate-800 backdrop-blur-sm text-slate-100 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <TrendingUp className="inline mr-3" size={24} />
              Leaderboards
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`group px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-2xl shadow-emerald-500/25'
                  : 'bg-slate-800 backdrop-blur-sm text-slate-100 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Target className="inline mr-3" size={24} />
              Season Schedule
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`group px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'tournaments'
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-2xl shadow-emerald-500/25'
                  : 'bg-slate-800 backdrop-blur-sm text-slate-100 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Calendar className="inline mr-3" size={24} />
              Tournament Hub
            </button>
            {isAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpload(true)}
                  className="group px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-green-500/25"
                >
                  <Upload className="inline mr-3" size={24} />
                  Upload Results
                </button>
                <button
                  onClick={() => setShowMappings(true)}
                  className="group px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-cyan-500/25"
                >
                  <Settings className="inline mr-3" size={24} />
                  Manage Mappings
                </button>
                <button
                  onClick={handleLogout}
                  className="group px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-red-500/25"
                >
                  <X className="inline mr-3" size={24} />
                  Logout Admin
                </button>
              </div>
            )}
          </div>

          {showLogin && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-slate-700 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
                    <Lock className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Admin Access</h3>
                  <p className="text-slate-300">Enter your credentials to continue</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                      className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                      placeholder="Password"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleLogin}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 text-white py-4 rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="flex-1 bg-slate-800 backdrop-blur-sm text-slate-300 py-4 rounded-xl hover:bg-slate-700 border border-slate-700 transition-all duration-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showUpload && isAdmin && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 backdrop-blur-xl rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Tournament Results</h3>
                  <p className="text-slate-300">Add new tournament data via CSV text or Excel/CSV file upload</p>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tournament Name</label>
                      <input
                        type="text"
                        value={uploadData.name}
                        onChange={(e) => setUploadData({...uploadData, name: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="Enter tournament name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                      <input
                        type="date"
                        value={uploadData.date}
                        onChange={(e) => setUploadData({...uploadData, date: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tournament Format</label>
                      <select
                        value={uploadData.format}
                        onChange={(e) => setUploadData({...uploadData, format: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                      >
                        <option value="Stroke Play" className="bg-gray-800">Stroke Play</option>
                        <option value="Stableford" className="bg-gray-800">Stableford</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tournament Type</label>
                      <select
                        value={uploadData.type}
                        onChange={(e) => setUploadData({...uploadData, type: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                      >
                        <option value="Major" className="bg-gray-800">Major Championship</option>
                        <option value="Tour Event" className="bg-gray-800">Tour Event</option>
                        <option value="League" className="bg-gray-800">League Play</option>
                        <option value="SUPR" className="bg-gray-800">SUPR Event</option>
                      </select>
                    </div>
                  </div>

                  {uploadData.format === 'Stroke Play' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Course Par</label>
                        <input
                          type="number"
                          min="60"
                          max="80"
                          value={uploadData.par}
                          onChange={(e) => setUploadData({...uploadData, par: parseInt(e.target.value) || 72})}
                          className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                          placeholder="Enter course par (e.g., 72)"
                        />
                        <p className="text-xs text-slate-400 mt-1">Typical values: 70-72 for 18 holes</p>
                      </div>
                      <div></div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-4">Data Input Method</label>
                    <div className="flex bg-slate-800 backdrop-blur-sm rounded-xl p-1 border border-slate-700 mb-6">
                      <button
                        onClick={() => setUploadData({...uploadData, uploadMethod: 'csv'})}
                        className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                          uploadData.uploadMethod === 'csv'
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <FileText size={20} />
                        CSV Text
                      </button>
                      <button
                        onClick={() => setUploadData({...uploadData, uploadMethod: 'file'})}
                        className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                          uploadData.uploadMethod === 'file'
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <FileSpreadsheet size={20} />
                        File Upload
                      </button>
                    </div>
                  </div>

                  {uploadData.uploadMethod === 'csv' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">CSV Data</label>
                      <textarea
                        value={uploadData.csvData}
                        onChange={(e) => setUploadData({...uploadData, csvData: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400 h-40"
                        placeholder={
                          uploadData.format === 'Stableford' 
                            ? "Player Name,Club,Total,Course Handicap\nJohn Smith,Sylvan,42,8\nJane Doe,8th,38,5"
                            : "Player Name,Club,Score,Course Handicap\nJohn Smith,Sylvan,-2,4\nJane Doe,8th,1,8"
                        }
                      />
                    </div>
                  )}

                  {uploadData.uploadMethod === 'file' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Upload Excel or CSV File</label>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
                      />
                      {selectedFile && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <FileSpreadsheet size={16} />
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 text-white py-4 rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Upload Tournament
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowUpload(false);
                      setSelectedFile(null);
                      setUploadData({...uploadData, csvData: '', uploadMethod: 'csv'});
                    }}
                    className="flex-1 bg-slate-800 backdrop-blur-sm text-slate-300 py-4 rounded-xl hover:bg-slate-700 border border-slate-700 transition-all duration-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showMappings && isAdmin && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 backdrop-blur-xl rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <Settings className="text-blue-400" size={32} />
                      Username to Club Mappings
                    </h3>
                    <p className="text-slate-300">Manage automatic club assignments based on player names</p>
                  </div>
                  <button
                    onClick={() => setShowMappings(false)}
                    className="p-3 rounded-full bg-white/10 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
                  >
                    <X className="text-white" size={24} />
                  </button>
                </div>

                <div className="mb-8">
                  <h4 className="text-xl font-bold text-white mb-4">Add New Mapping</h4>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Trackman ID</label>
                      <input
                        type="text"
                        value={newMapping.trackmanId}
                        onChange={(e) => setNewMapping({...newMapping, trackmanId: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="e.g., Chad_Mathews"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={newMapping.name}
                        onChange={(e) => setNewMapping({...newMapping, name: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                        placeholder="e.g., Chad Mathews"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Club</label>
                      <select
                        value={newMapping.club}
                        onChange={(e) => setNewMapping({...newMapping, club: e.target.value})}
                        className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      >
                        <option value="Sylvan" className="bg-gray-800">Sylvan</option>
                        <option value="8th" className="bg-gray-800">8th</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={addMapping}
                        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                      >
                        <Plus size={20} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* CSV Upload Section */}
                <div className="mb-8">
                  <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-400" size={24} />
                    Bulk Upload from CSV
                  </h4>
                  <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="mb-4">
                      <p className="text-slate-300 text-sm mb-3">
                        Upload a CSV file with columns: <code className="bg-white/10 px-2 py-1 rounded text-emerald-400">trackman_id</code>, <code className="bg-white/10 px-2 py-1 rounded text-emerald-400">display_name</code>, <code className="bg-white/10 px-2 py-1 rounded text-emerald-400">club</code>
                      </p>
                      <p className="text-slate-400 text-xs">
                        Club values must be either 'Sylvan' or '8th'. Existing players will be updated with new information.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-4 items-end mb-4">
                      <div className="col-span-8">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Select CSV File</label>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileChange}
                          className="w-full p-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600"
                        />
                      </div>
                      <div className="col-span-4 flex gap-2">
                        <button
                          onClick={uploadCsvData}
                          disabled={csvLoading || csvData.length === 0 || csvErrors.length > 0}
                          className="flex-1 px-4 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {csvLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              Upload
                            </>
                          )}
                        </button>
                        <button
                          onClick={clearCsvData}
                          className="px-4 py-4 bg-slate-800 backdrop-blur-sm text-slate-300 rounded-xl hover:bg-slate-700 border border-slate-700 transition-all duration-300 font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Error Display */}
                    {csvErrors.length > 0 && (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <h5 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                          <X size={16} />
                          Validation Errors ({csvErrors.length})
                        </h5>
                        <div className="text-red-300 text-sm space-y-1 max-h-32 overflow-y-auto">
                          {csvErrors.slice(0, 10).map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                          {csvErrors.length > 10 && (
                            <div className="text-red-400 font-medium">... and {csvErrors.length - 10} more errors</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview Data */}
                    {showCsvPreview && csvPreview.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <Target size={16} />
                          Preview ({csvData.length} total records)
                        </h5>
                        <div className="bg-white/5 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-12 gap-4 p-3 bg-white/10 text-slate-300 text-sm font-medium">
                            <div className="col-span-4">Trackman ID</div>
                            <div className="col-span-5">Display Name</div>
                            <div className="col-span-3">Club</div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {csvPreview.map((row, index) => (
                              <div key={index} className="grid grid-cols-12 gap-4 p-3 text-sm border-t border-white/5 hover:bg-white/5">
                                <div className="col-span-4 text-white font-mono">{row.trackman_id}</div>
                                <div className="col-span-5 text-slate-300">{row.display_name}</div>
                                <div className="col-span-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    row.club === 'Sylvan' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {row.club}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {csvData.length > 10 && (
                            <div className="p-3 bg-white/5 text-center text-slate-400 text-sm border-t border-white/5">
                              ... and {csvData.length - 10} more records
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white mb-4">Current Mappings</h4>
                  <div className="space-y-3">
                    {supabasePlayers.map((player) => (
                      <div key={player.id} className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <div className="text-slate-400 text-xs mb-1">Trackman ID</div>
                            <div className="text-white font-medium">{player.trackman_id}</div>
                          </div>
                          <div className="col-span-1 text-center">
                            <div className="text-slate-400">→</div>
                          </div>
                          <div className="col-span-4">
                            <div className="text-slate-400 text-xs mb-1">Display Name</div>
                            <input
                              type="text"
                              value={player.display_name}
                              onChange={(e) => updateMapping(player.id, e.target.value, player.club)}
                              className="w-full px-3 py-2 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <div className="text-slate-400 text-xs mb-1">Club</div>
                            <select
                              value={player.club}
                              onChange={(e) => updateMapping(player.id, player.display_name, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                            >
                              <option value="Sylvan" className="bg-gray-800">Sylvan</option>
                              <option value="8th" className="bg-gray-800">8th</option>
                            </select>
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold mr-2 ${
                              player.club === 'Sylvan' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border border-green-400/30' : 
                              player.club === '8th' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30' : 
                              'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg shadow-gray-500/25 border border-gray-400/30'
                            }`}>
                              {player.club}
                            </span>
                            <button
                              onClick={() => deleteMapping(player.id)}
                              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all duration-300 border border-red-500/30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {supabasePlayers.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No mappings configured yet. Add your first mapping above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showPlayerDetails && selectedPlayer && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 backdrop-blur-xl rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <Trophy className="text-emerald-400" size={32} />
                      {selectedPlayer.name}
                    </h3>
                    <div className="flex items-center gap-4 text-slate-300">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedPlayer.club === 'Sylvan' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border border-green-400/30' : 
                        selectedPlayer.club === '8th' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30' : 
                        'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg shadow-gray-500/25 border border-gray-400/30'
                      }`}>
                        {selectedPlayer.club}
                      </span>
                      <span className="text-emerald-400 font-bold text-lg">{selectedPlayer.totalPoints.toFixed(1)} pts</span>
                      <span className="text-blue-400">{selectedPlayer.countingEvents}/8 events counting</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlayerDetails(false)}
                    className="p-3 rounded-full bg-white/10 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
                  >
                    <X className="text-white" size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-xl font-bold text-white mb-4">Tournament Results</h4>
                  <div className="grid gap-4">
                    {selectedPlayer.allEvents.map((event: any, index: number) => (
                      <div key={index} className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-slate-700 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-bold text-white text-lg">{event.tournamentName}</h5>
                            <p className="text-slate-300 text-sm">{event.tournamentDate}</p>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="text-slate-400 text-xs">Position</div>
                              <div className={`font-bold text-lg ${
                                event.position === 1 ? 'text-yellow-400' :
                                event.position <= 3 ? 'text-emerald-400' :
                                event.position <= 10 ? 'text-blue-400' :
                                'text-slate-300'
                              }`}>
                                {event.position === Infinity ? '-' : event.position}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs">Gross</div>
                              <div className="text-white font-medium text-lg">{event.gross}</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs">Net</div>
                              <div className="text-emerald-400 font-medium text-lg">{event.net}</div>
                            </div>
                            <div>
                              <div className="text-slate-400 text-xs">Points</div>
                              <div className="text-yellow-400 font-bold text-lg">{event.points.toFixed(1)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/20 pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-slate-400 text-sm mb-1">Total Events</div>
                      <div className="text-white font-bold text-2xl">{selectedPlayer.totalEvents}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-slate-400 text-sm mb-1">Counting Events</div>
                      <div className="text-blue-400 font-bold text-2xl">{selectedPlayer.countingEvents}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-slate-400 text-sm mb-1">Best Finish</div>
                      <div className={`font-bold text-2xl ${
                        selectedPlayer.bestFinish === 1 ? 'text-yellow-400' :
                        selectedPlayer.bestFinish <= 3 ? 'text-emerald-400' :
                        selectedPlayer.bestFinish <= 10 ? 'text-blue-400' :
                        'text-slate-300'
                      }`}>
                        {selectedPlayer.bestFinish === Infinity ? '-' : selectedPlayer.bestFinish}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-slate-400 text-sm mb-1">Avg {leaderboardType === 'net' ? 'Net' : 'Gross'}</div>
                      <div className="text-emerald-400 font-bold text-2xl">
                        {leaderboardType === 'net' ? selectedPlayer.avgNet : selectedPlayer.avgGross}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700">
              <div className="mb-8 animate-in fade-in-0 duration-1000">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Target className="text-emerald-400" size={32} />
                  2025 Season Schedule
                </h2>
                <p className="text-slate-300">Tournament calendar and upcoming events</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {Object.entries(schedule).map(([month, events]) => (
                  <div key={month} className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <h3 className="text-2xl font-bold text-white mb-6 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                      {month}
                    </h3>
                    
                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl animate-in fade-in-0 duration-500 ${
                          event.type === 'Major' ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30' :
                          event.type === 'Tour Event' ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30' :
                          event.type === 'League' ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30' :
                          event.type === 'SUPR' ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30' :
                          'bg-white/10 border-white/20'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  event.type === 'Major' ? 'bg-purple-500 text-white' :
                                  event.type === 'Tour Event' ? 'bg-blue-500 text-white' :
                                  event.type === 'League' ? 'bg-green-500 text-white' :
                                  event.type === 'SUPR' ? 'bg-orange-500 text-white' :
                                  'bg-gray-500 text-white'
                                }`}>
                                  {event.type}
                                </span>
                                {event.venue && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-white/20 text-white">
                                    {event.venue}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-white text-lg leading-tight">
                                {event.name}
                              </h4>
                              {event.subtitle && (
                                <p className="text-slate-300 text-sm mt-1">
                                  {event.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-medium">
                              {event.date}
                            </span>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              getEventStatus(event.date) === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              getEventStatus(event.date) === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {getEventStatus(event.date) === 'completed' ? 'Finished' :
                               getEventStatus(event.date) === 'live' ? 'In Progress' : 'Upcoming'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl p-6 border border-yellow-500/30">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Playoff Qualification</h3>
                  <div className="text-slate-300 text-lg max-w-3xl mx-auto leading-relaxed">
                    <p className="mb-3">
                      <strong className="text-yellow-400">Top 4 Net</strong> and <strong className="text-yellow-400">Top 4 Gross</strong> players from each club qualify for the season-ending playoff.
                    </p>
                    <p>
                      Players with a <Star className="inline text-yellow-400 mx-1" size={16} /> star have mathematically secured their playoff spot!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700">
              <div className="flex flex-wrap gap-6 mb-8 items-center justify-between animate-in fade-in-0 duration-1000">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <TrendingUp className="text-emerald-400" size={32} />
                    Championship Leaderboard
                  </h2>
                  <p className="text-slate-300">Top 8 events count toward season standings</p>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex bg-slate-800 backdrop-blur-sm rounded-xl p-1 border border-slate-700">
                    <button
                      onClick={() => setLeaderboardType('net')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        leaderboardType === 'net'
                          ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      Net
                    </button>
                    <button
                      onClick={() => setLeaderboardType('gross')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        leaderboardType === 'gross'
                          ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      Gross
                    </button>
                  </div>
                  
                  <div className="flex bg-slate-800 backdrop-blur-sm rounded-xl p-1 border border-slate-700">
                    <button
                      onClick={() => setSelectedClub('all')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        selectedClub === 'all'
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      All Clubs
                    </button>
                    <button
                      onClick={() => setSelectedClub('Sylvan')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        selectedClub === 'Sylvan'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      Sylvan
                    </button>
                    <button
                      onClick={() => setSelectedClub('8th')}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        selectedClub === '8th'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      8th
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20 bg-gradient-to-r from-white/10 to-white/5">
                      <th className="text-left p-4 font-semibold text-gray-200">Name</th>
                      <th className="text-left p-4 font-semibold text-gray-200">Club</th>
                      <th className="text-left p-4 font-semibold text-gray-200">Total Points</th>
                      <th className="text-left p-4 font-semibold text-gray-200">Best Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLeaderboard().map((player: any, index) => (
                      <tr key={player.name} className={`border-b border-white/10 hover:bg-slate-700 transition-all duration-300 group animate-in fade-in-0 duration-700 ${
                        index <= 2 ? 'bg-gradient-to-r from-white/5 to-transparent' : ''
                      }`} style={{animationDelay: `${index * 100}ms`}}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getPositionBadge(index + 1, false)}`}>
                              {index + 1}
                            </div>
                            {getRankIcon()}
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600`}></div>
                            <button
                              onClick={() => handlePlayerClick(player)}
                              className="text-white font-medium group-hover:text-emerald-300 transition-colors duration-300 hover:underline cursor-pointer text-left"
                            >
                              {player.name}
                              {isPlayoffQualified(player, getFilteredLeaderboard()) && (
                                <Star className="inline ml-2 text-yellow-400" size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            player.club === 'Sylvan' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border border-green-400/30' : 
                            player.club === '8th' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30' : 
                            'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg shadow-gray-500/25 border border-gray-400/30'
                          }`}>
                            {player.club}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold text-lg">
                              {player.totalPoints.toFixed(1)}
                            </span>
                            <span className="text-xs text-emerald-300">pts</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${
                            player.bestFinish === 1 ? 'text-yellow-400' :
                            player.bestFinish <= 3 ? 'text-emerald-400' :
                            player.bestFinish <= 10 ? 'text-blue-400' :
                            'text-slate-300'
                          }`}>
                            {player.bestFinish === Infinity ? '-' : player.bestFinish}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tournaments' && (
            <div className="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700">
              <div className="flex flex-wrap gap-6 mb-8 items-center justify-between animate-in fade-in-0 duration-1000">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Calendar className="text-emerald-400" size={32} />
                    Tournament Hub
                  </h2>
                  <p className="text-slate-300">Complete tournament results and standings</p>
                </div>
                
                <div className="relative">
                  <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="px-6 py-4 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white appearance-none pr-12 min-w-[300px]"
                  >
                    <option value="" className="bg-gray-800">Select a tournament</option>
                    {supabaseTournaments.map(tournament => (
                      <option key={tournament.id} value={tournament.id} className="bg-gray-800">
                        {tournament.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>

              {selectedTournamentData && (
                <div>
                  <div className={`mb-8 p-6 bg-gradient-to-r ${getTournamentTypeColor(selectedTournamentData.type)} rounded-2xl shadow-2xl`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-2xl text-white mb-2">{selectedTournamentData.name}</h3>
                        <div className="flex items-center gap-6 text-slate-100">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{selectedTournamentData.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy size={16} />
                            <span>{selectedTournamentData.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={16} />
                            <span>{tournamentResults.length} Players</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-300 text-sm">{tournamentLeaderboardType === 'net' ? 'Net' : 'Gross'} Winner</div>
                        <div className="text-white font-bold text-xl">
                          {(() => {
                            const sortedResults = tournamentResults.sort((a, b) => 
                              tournamentLeaderboardType === 'net' 
                                ? a.net_position - b.net_position 
                                : a.gross_position - b.gross_position
                            );
                            return sortedResults[0]?.player?.display_name || 'No Results';
                          })()}
                        </div>
                        <div className="text-slate-100">
                          Score: {(() => {
                            const sortedResults = tournamentResults.sort((a, b) => 
                              tournamentLeaderboardType === 'net' 
                                ? a.net_position - b.net_position 
                                : a.gross_position - b.gross_position
                            );
                            const winner = sortedResults[0];
                            const score = tournamentLeaderboardType === 'net' ? winner?.net_score : winner?.gross_score;
                            return score;
                          })()} {selectedTournamentData?.format === 'Stableford' ? 'pts' : ''}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${selectedTournamentData.name}"? This will permanently delete the tournament and all its results.`)) {
                                deleteTournament(selectedTournamentData.id);
                                setSelectedTournament('');
                              }
                            }}
                            className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
                          >
                            Delete Tournament
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tournament Leaderboard Type Toggle */}
                  <div className="flex justify-center mb-6">
                    <div className="flex bg-slate-800 backdrop-blur-sm rounded-xl p-1 border border-slate-700">
                      <button
                        onClick={() => setTournamentLeaderboardType('net')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                          tournamentLeaderboardType === 'net'
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        Net
                      </button>
                      <button
                        onClick={() => setTournamentLeaderboardType('gross')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                          tournamentLeaderboardType === 'gross'
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        Gross
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20 bg-gradient-to-r from-white/10 to-white/5">
                          <th className="text-left p-4 font-semibold text-gray-200">Position</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Player</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Club</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Gross</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Net</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Handicap</th>
                          <th className="text-left p-4 font-semibold text-gray-200">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentResults
                          .sort((a, b) => 
                            tournamentLeaderboardType === 'net' 
                              ? a.net_position - b.net_position 
                              : a.gross_position - b.gross_position
                          )
                          .map((result: any, index) => {
                            const position = tournamentLeaderboardType === 'net' ? result.net_position : result.gross_position;
                            const points = tournamentLeaderboardType === 'net' ? result.net_points : result.gross_points;
                            
                            return (
                          <tr key={index} className={`border-b border-white/10 hover:bg-slate-700 transition-all duration-300 group animate-in fade-in-0 duration-700 ${
                            position <= 4 ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-b-emerald-500/30' : ''
                          } ${
                            position === 4 ? 'border-b-4 border-b-emerald-500/50' : ''
                          }`} style={{animationDelay: `${index * 50}ms`}}>
                            <td className="p-4 font-bold text-white">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getPositionBadge(position, true)}`}>
                                  {position}
                                </div>
                                {result.tied_players && result.tied_players > 1 && (
                                  <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded-full border border-yellow-400/30">
                                    T{result.tied_players}
                                  </span>
                                )}
                                {getRankIcon()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  position <= 4 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50' :
                                  'bg-gradient-to-r from-blue-400 to-blue-600'
                                }`}></div>
                                <span className="text-white font-medium group-hover:text-emerald-300 transition-colors duration-300">
                                  {result.player?.display_name || 'Unknown Player'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                result.player?.club === 'Sylvan' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 border border-green-400/30' : 
                                result.player?.club === '8th' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30' : 
                                'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg shadow-gray-500/25 border border-gray-400/30'
                              }`}>
                                {result.player?.club}
                              </span>
                            </td>
                            <td className="p-4 text-white font-medium text-lg">{result.gross_score}</td>
                            <td className="p-4 text-emerald-400 font-medium text-lg">
                              {result.net_score}{selectedTournamentData?.format === 'Stableford' ? ' pts' : ''}
                            </td>
                            <td className="p-4 text-slate-300">{result.handicap}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-400 font-bold text-lg">
                                  {typeof points === 'number' ? points.toFixed(2) : points}
                                </span>
                                <span className="text-xs text-yellow-300">pts</span>
                                {result.tied_players && result.tied_players > 1 && (
                                  <span className="text-xs text-slate-400 bg-gray-400/20 px-1 py-0.5 rounded">(split)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {supabaseTournaments.length === 0 && (
                <div className="text-center py-20 animate-in fade-in-0 duration-1000">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full mb-6 opacity-50 animate-pulse">
                    <Users className="text-white" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Tournaments Yet</h3>
                  <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                    Upload your first tournament results to get started with the championship tracking system
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="mt-6 px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 font-semibold transform hover:scale-105 shadow-2xl shadow-emerald-500/25"
                    >
                      <Upload className="inline mr-2" size={20} />
                      Upload First Tournament
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700">
              <div className="mb-8 animate-in fade-in-0 duration-1000">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <FileText className="text-emerald-400" size={32} />
                  About Founders Series
                </h2>
                <p className="text-slate-300">A summer long race to the championship</p>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-400" size={28} />
                    What is it?
                  </h3>
                  <p className="text-slate-300 leading-relaxed mb-4 text-lg">
                    A summer long race to the championship and a chance for members to compete, play, hangout, and win.
                  </p>
                  <p className="text-slate-300 leading-relaxed mb-4 text-lg">
                    Show up, play well, and you'll climb the leaderboard, make the Founders Cup team, qualify for the playoffs and win cash.
                  </p>
                  <p className="text-slate-300 leading-relaxed text-lg">
                    We've designed 23 tournaments to offer the low, mid and high handicapper the chance to win.
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="text-red-400" size={24} />
                    FOUNDERS CUP
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-lg">
                    A Ryder Cup event pitting Sylvan against 8th ave.
                    The top 4 gross and top 4 net players from each clubhouse will face off in a battle to crown the best clubhouse.
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="text-green-400" size={24} />
                    THE PLAYOFF
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-lg">
                    An outdoor 18 hole shootout at The Golf Club of TN. The top 3 players on the gross and the top 3 players on the net leaderboard play for a chance at the Founders Series championship and $1,000
                  </p>
                </div>

                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-green-400">💰</span>
                    How much?
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
                      <h4 className="text-xl font-bold text-white mb-4 text-center">FOUNDRY CLUB</h4>
                      <ul className="text-slate-300 space-y-3 mb-6">
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">✓</span>
                          All events included
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">✓</span>
                          4 Free Guest hours ($100 value)
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">✓</span>
                          Sick Foundry Tee
                        </li>
                      </ul>
                      <div className="text-center">
                        <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105">
                          Register (40 available)
                        </button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6">
                      <h4 className="text-xl font-bold text-white mb-4 text-center">Without Foundry Club</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                          <span className="text-slate-300">MAJORS</span>
                          <span className="text-white font-bold">$35/event</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                          <span className="text-slate-300">TOUR</span>
                          <span className="text-white font-bold">$25/event</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                          <span className="text-slate-300">LEAGUE</span>
                          <span className="text-white font-bold">$5/event</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                          <span className="text-slate-300">SUPR CLUB</span>
                          <span className="text-white font-bold">$0/event</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {!isAdmin && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setShowLogin(true)}
              className="group px-8 py-4 rounded-2xl font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-orange-500/25"
            >
              <Lock className="inline mr-3" size={24} />
              Admin Access
            </button>
          </div>
        )}

        {/* New Players Modal */}
        {showNewPlayersModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Users className="text-emerald-400" size={32} />
                  New Players Detected
                </h2>
                <button
                  onClick={handleNewPlayersCancel}
                  className="p-2 rounded-lg bg-white/10 hover:bg-slate-700 text-white transition-all duration-300"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-300 text-lg leading-relaxed">
                  The following TrackmanIDs were found in the uploaded tournament but don't exist in the database yet. 
                  Please review and confirm the display names for these new players:
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {newPlayersFound.map((newPlayer, index) => (
                  <div key={newPlayer.trackmanId} className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="text-slate-400 text-sm mb-2">TrackmanID (from upload)</div>
                        <div className="text-white font-mono bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600">
                          {newPlayer.trackmanId}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className="text-slate-400">→</div>
                      </div>
                      <div className="col-span-4">
                        <div className="text-slate-400 text-sm mb-2">Display Name</div>
                        <input
                          type="text"
                          value={newPlayer.suggestedName}
                          onChange={(e) => {
                            const updatedPlayers = [...newPlayersFound];
                            updatedPlayers[index].suggestedName = e.target.value;
                            setNewPlayersFound(updatedPlayers);
                          }}
                          className="w-full px-3 py-2 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                          placeholder="Enter display name..."
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="text-slate-400 text-sm mb-2">Club</div>
                        <select
                          value={newPlayer.club}
                          onChange={(e) => {
                            const updatedPlayers = [...newPlayersFound];
                            updatedPlayers[index].club = e.target.value as 'Sylvan' | '8th';
                            setNewPlayersFound(updatedPlayers);
                          }}
                          className="w-full px-3 py-2 bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                        >
                          <option value="Sylvan" className="bg-gray-800">Sylvan</option>
                          <option value="8th" className="bg-gray-800">8th</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={handleNewPlayersCancel}
                  className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-all duration-300"
                >
                  Cancel Upload
                </button>
                <button
                  onClick={handleNewPlayersConfirm}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  Add Players & Continue Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GolfTournamentSystem;