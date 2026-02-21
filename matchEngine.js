/**
 * Match Engine for Salfoon Ramadan League Platform
 * Handles match CRUD operations, validation, and status management
 */

import LocalStorageManager from './storage.js';
import TournamentSystem from './tournamentEngine.js';

class MatchEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.tournament = new TournamentSystem();
        this.validStatuses = ['scheduled', 'played', 'postponed'];
        this.ramadanDayRange = { min: 3, max: 23 };
    }

    /**
     * Create a new match
     */
    createMatch(matchData) {
        try {
            // Validate match data
            const validation = this.validateMatchData(matchData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            // Check for duplicate match ID
            const existingMatch = matchesData.matches.find(match => match.id === matchData.id);
            if (existingMatch) {
                throw new Error(`Match with ID ${matchData.id} already exists`);
            }

            // Add new match
            const newMatch = {
                id: matchData.id,
                day: matchData.day,
                homeTeam: matchData.homeTeam,
                awayTeam: matchData.awayTeam,
                scheduledTime: matchData.scheduledTime || '21:00',
                homeGoals: matchData.homeGoals || null,
                awayGoals: matchData.awayGoals || null,
                status: matchData.status || 'scheduled',
                bestPlayer: matchData.bestPlayer || null,
                postponementReason: matchData.postponementReason || null,
                lastUpdated: new Date().toISOString()
            };

            matchesData.matches.push(newMatch);
            
            // Sort matches by day
            matchesData.matches.sort((a, b) => a.day - b.day);

            // Save to storage
            const saved = this.storage.save(this.storage.keys.MATCHES, matchesData);
            if (!saved) {
                throw new Error('Failed to save match data');
            }

            return {
                success: true,
                match: newMatch
            };

        } catch (error) {
            console.error('Error creating match:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update match result
     */
    updateResult(matchId, result) {
        try {
            if (!matchId || !result) {
                throw new Error('Match ID and result are required');
            }

            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            const matchIndex = matchesData.matches.findIndex(match => match.id === matchId);
            if (matchIndex === -1) {
                throw new Error(`Match with ID ${matchId} not found`);
            }

            const match = matchesData.matches[matchIndex];

            // Validate result data
            if (result.homeGoals !== null && result.homeGoals !== undefined) {
                const homeGoals = parseInt(result.homeGoals);
                if (isNaN(homeGoals) || homeGoals < 0) {
                    throw new Error('Invalid home team goals');
                }
                match.homeGoals = homeGoals;
            }

            if (result.awayGoals !== null && result.awayGoals !== undefined) {
                const awayGoals = parseInt(result.awayGoals);
                if (isNaN(awayGoals) || awayGoals < 0) {
                    throw new Error('Invalid away team goals');
                }
                match.awayGoals = awayGoals;
            }

            // Update status if goals are provided
            if (match.homeGoals !== null && match.awayGoals !== null) {
                match.status = 'played';
            }

            // Update best player if provided
            if (result.bestPlayer) {
                match.bestPlayer = result.bestPlayer;
            }

            // Update timestamp
            match.lastUpdated = new Date().toISOString();

            // Save to storage
            const saved = this.storage.save(this.storage.keys.MATCHES, matchesData);
            if (!saved) {
                throw new Error('Failed to save match result');
            }

            // Update team statistics if match is played
            if (match.status === 'played') {
                this.updateTeamStatistics(match);
            }

            return {
                success: true,
                match: match
            };

        } catch (error) {
            console.error('Error updating match result:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set match status
     */
    setMatchStatus(matchId, status, reason = null) {
        try {
            if (!matchId || !status) {
                throw new Error('Match ID and status are required');
            }

            if (!this.validStatuses.includes(status)) {
                throw new Error(`Invalid status. Must be one of: ${this.validStatuses.join(', ')}`);
            }

            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            const matchIndex = matchesData.matches.findIndex(match => match.id === matchId);
            if (matchIndex === -1) {
                throw new Error(`Match with ID ${matchId} not found`);
            }

            const match = matchesData.matches[matchIndex];
            const oldStatus = match.status;

            // Validate status transition
            const validTransition = this.validateStatusTransition(oldStatus, status);
            if (!validTransition.valid) {
                throw new Error(validTransition.error);
            }

            // Update status
            match.status = status;
            match.lastUpdated = new Date().toISOString();

            // Handle postponement
            if (status === 'postponed') {
                if (!reason) {
                    throw new Error('Postponement reason is required');
                }
                match.postponementReason = reason;
                // Clear goals if match was previously played
                if (oldStatus === 'played') {
                    match.homeGoals = null;
                    match.awayGoals = null;
                    match.bestPlayer = null;
                }
            } else {
                match.postponementReason = null;
            }

            // Save to storage
            const saved = this.storage.save(this.storage.keys.MATCHES, matchesData);
            if (!saved) {
                throw new Error('Failed to save match status');
            }

            // Update team statistics if needed
            if (oldStatus === 'played' && status !== 'played') {
                this.recalculateAllStatistics();
            } else if (status === 'played' && match.homeGoals !== null && match.awayGoals !== null) {
                this.updateTeamStatistics(match);
            }

            return {
                success: true,
                match: match,
                oldStatus: oldStatus
            };

        } catch (error) {
            console.error('Error setting match status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate match data
     */
    validateMatchData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return { valid: false, error: 'Invalid match data' };
            }

            // Required fields
            if (!data.id) {
                return { valid: false, error: 'Match ID is required' };
            }

            if (!data.day || typeof data.day !== 'number') {
                return { valid: false, error: 'Valid match day is required' };
            }

            if (!data.homeTeam || !data.awayTeam) {
                return { valid: false, error: 'Home and away teams are required' };
            }

            if (data.homeTeam === data.awayTeam) {
                return { valid: false, error: 'Home and away teams cannot be the same' };
            }

            // Validate Ramadan day range
            if (data.day < this.ramadanDayRange.min || data.day > this.ramadanDayRange.max) {
                return { 
                    valid: false, 
                    error: `Match day must be between ${this.ramadanDayRange.min} and ${this.ramadanDayRange.max}` 
                };
            }

            // Validate teams exist
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (teamsData) {
                const teamIds = teamsData.teams.map(team => team.id);
                if (!teamIds.includes(data.homeTeam)) {
                    return { valid: false, error: `Home team ${data.homeTeam} does not exist` };
                }
                if (!teamIds.includes(data.awayTeam)) {
                    return { valid: false, error: `Away team ${data.awayTeam} does not exist` };
                }
            }

            // Validate status if provided
            if (data.status && !this.validStatuses.includes(data.status)) {
                return { 
                    valid: false, 
                    error: `Invalid status. Must be one of: ${this.validStatuses.join(', ')}` 
                };
            }

            // Validate goals if provided
            if (data.homeGoals !== null && data.homeGoals !== undefined) {
                const homeGoals = parseInt(data.homeGoals);
                if (isNaN(homeGoals) || homeGoals < 0) {
                    return { valid: false, error: 'Invalid home team goals' };
                }
            }

            if (data.awayGoals !== null && data.awayGoals !== undefined) {
                const awayGoals = parseInt(data.awayGoals);
                if (isNaN(awayGoals) || awayGoals < 0) {
                    return { valid: false, error: 'Invalid away team goals' };
                }
            }

            // Validate time format if provided
            if (data.scheduledTime) {
                const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(data.scheduledTime)) {
                    return { valid: false, error: 'Invalid time format. Use HH:MM format' };
                }
            }

            return { valid: true };

        } catch (error) {
            console.error('Error validating match data:', error);
            return { valid: false, error: 'Validation error occurred' };
        }
    }

    /**
     * Validate status transition
     */
    validateStatusTransition(oldStatus, newStatus) {
        const validTransitions = {
            'scheduled': ['played', 'postponed'],
            'played': ['postponed'], // Can postpone a played match (rare case)
            'postponed': ['scheduled', 'played']
        };

        if (!validTransitions[oldStatus] || !validTransitions[oldStatus].includes(newStatus)) {
            return {
                valid: false,
                error: `Invalid status transition from ${oldStatus} to ${newStatus}`
            };
        }

        return { valid: true };
    }

    /**
     * Update team statistics after match result
     */
    updateTeamStatistics(match) {
        try {
            if (match.status !== 'played' || match.homeGoals === null || match.awayGoals === null) {
                return false;
            }

            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (!teamsData) {
                throw new Error('Failed to load teams data');
            }

            const homeTeam = teamsData.teams.find(team => team.id === match.homeTeam);
            const awayTeam = teamsData.teams.find(team => team.id === match.awayTeam);

            if (!homeTeam || !awayTeam) {
                throw new Error('Team not found');
            }

            // Calculate points
            const points = this.tournament.calculatePoints(match);

            // Update home team statistics
            homeTeam.statistics.played += 1;
            homeTeam.statistics.goalsFor += match.homeGoals;
            homeTeam.statistics.goalsAgainst += match.awayGoals;
            homeTeam.statistics.points += points.homePoints;

            if (points.result === 'home_win') {
                homeTeam.statistics.won += 1;
            } else if (points.result === 'draw') {
                homeTeam.statistics.drawn += 1;
            } else if (points.result === 'away_win') {
                homeTeam.statistics.lost += 1;
            }

            // Update away team statistics
            awayTeam.statistics.played += 1;
            awayTeam.statistics.goalsFor += match.awayGoals;
            awayTeam.statistics.goalsAgainst += match.homeGoals;
            awayTeam.statistics.points += points.awayPoints;

            if (points.result === 'away_win') {
                awayTeam.statistics.won += 1;
            } else if (points.result === 'draw') {
                awayTeam.statistics.drawn += 1;
            } else if (points.result === 'home_win') {
                awayTeam.statistics.lost += 1;
            }

            // Save updated teams data
            const saved = this.storage.save(this.storage.keys.TEAMS, teamsData);
            if (!saved) {
                throw new Error('Failed to save team statistics');
            }

            return true;

        } catch (error) {
            console.error('Error updating team statistics:', error);
            return false;
        }
    }

    /**
     * Recalculate all team statistics from scratch
     */
    recalculateAllStatistics() {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            const matchesData = this.storage.load(this.storage.keys.MATCHES);

            if (!teamsData || !matchesData) {
                throw new Error('Failed to load data');
            }

            // Reset all team statistics
            teamsData.teams.forEach(team => {
                team.statistics = {
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    points: 0
                };
            });

            // Recalculate from all played matches
            const playedMatches = matchesData.matches.filter(match => 
                match.status === 'played' && 
                match.homeGoals !== null && 
                match.awayGoals !== null
            );

            playedMatches.forEach(match => {
                const homeTeam = teamsData.teams.find(team => team.id === match.homeTeam);
                const awayTeam = teamsData.teams.find(team => team.id === match.awayTeam);

                if (homeTeam && awayTeam) {
                    const points = this.tournament.calculatePoints(match);

                    // Update home team
                    homeTeam.statistics.played += 1;
                    homeTeam.statistics.goalsFor += match.homeGoals;
                    homeTeam.statistics.goalsAgainst += match.awayGoals;
                    homeTeam.statistics.points += points.homePoints;

                    if (points.result === 'home_win') {
                        homeTeam.statistics.won += 1;
                    } else if (points.result === 'draw') {
                        homeTeam.statistics.drawn += 1;
                    } else if (points.result === 'away_win') {
                        homeTeam.statistics.lost += 1;
                    }

                    // Update away team
                    awayTeam.statistics.played += 1;
                    awayTeam.statistics.goalsFor += match.awayGoals;
                    awayTeam.statistics.goalsAgainst += match.homeGoals;
                    awayTeam.statistics.points += points.awayPoints;

                    if (points.result === 'away_win') {
                        awayTeam.statistics.won += 1;
                    } else if (points.result === 'draw') {
                        awayTeam.statistics.drawn += 1;
                    } else if (points.result === 'home_win') {
                        awayTeam.statistics.lost += 1;
                    }
                }
            });

            // Save updated teams data
            const saved = this.storage.save(this.storage.keys.TEAMS, teamsData);
            if (!saved) {
                throw new Error('Failed to save recalculated statistics');
            }

            return true;

        } catch (error) {
            console.error('Error recalculating statistics:', error);
            return false;
        }
    }

    /**
     * Get match by ID
     */
    getMatch(matchId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return null;
            }

            return matchesData.matches.find(match => match.id === matchId) || null;
        } catch (error) {
            console.error('Error getting match:', error);
            return null;
        }
    }

    /**
     * Get matches by team
     */
    getMatchesByTeam(teamId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return [];
            }

            return matchesData.matches.filter(match => 
                match.homeTeam === teamId || match.awayTeam === teamId
            );
        } catch (error) {
            console.error('Error getting matches by team:', error);
            return [];
        }
    }

    /**
     * Get matches by status
     */
    getMatchesByStatus(status) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return [];
            }

            return matchesData.matches.filter(match => match.status === status);
        } catch (error) {
            console.error('Error getting matches by status:', error);
            return [];
        }
    }

    /**
     * Get matches by day range
     */
    getMatchesByDayRange(startDay, endDay) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return [];
            }

            return matchesData.matches.filter(match => 
                match.day >= startDay && match.day <= endDay
            );
        } catch (error) {
            console.error('Error getting matches by day range:', error);
            return [];
        }
    }

    /**
     * Delete match (admin function)
     */
    deleteMatch(matchId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            const matchIndex = matchesData.matches.findIndex(match => match.id === matchId);
            if (matchIndex === -1) {
                throw new Error(`Match with ID ${matchId} not found`);
            }

            // Remove match
            const deletedMatch = matchesData.matches.splice(matchIndex, 1)[0];

            // Save updated data
            const saved = this.storage.save(this.storage.keys.MATCHES, matchesData);
            if (!saved) {
                throw new Error('Failed to save after match deletion');
            }

            // Recalculate statistics if deleted match was played
            if (deletedMatch.status === 'played') {
                this.recalculateAllStatistics();
            }

            return {
                success: true,
                deletedMatch: deletedMatch
            };

        } catch (error) {
            console.error('Error deleting match:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default MatchEngine;