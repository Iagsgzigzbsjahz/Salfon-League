/**
 * Standings Calculator Engine for Salfoon Ramadan League Platform
 * Handles real-time standings calculation, tie-breaking, and qualification determination
 */

import LocalStorageManager from './storage.js';
import TournamentSystem from './tournamentEngine.js';

class StandingsCalculator {
    constructor() {
        this.storage = new LocalStorageManager();
        this.tournament = new TournamentSystem();
        this.playoffQualifiers = 4;
    }

    /**
     * Calculate current standings from all played matches
     */
    calculateStandings(matches = null) {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            const matchesData = matches || this.storage.load(this.storage.keys.MATCHES);

            if (!teamsData || !matchesData) {
                throw new Error('Failed to load required data');
            }

            // Create standings array from teams
            const standings = teamsData.teams.map(team => ({
                teamId: team.id,
                teamName: team.name,
                shortName: team.shortName,
                logo: team.logo,
                colors: team.colors,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
                form: [], // Last 5 matches
                qualified: false,
                position: 0
            }));

            // Process all played matches
            const playedMatches = matchesData.matches ? 
                matchesData.matches.filter(match => match.status === 'played' && 
                    match.homeGoals !== null && match.awayGoals !== null) :
                matchesData.filter(match => match.status === 'played' && 
                    match.homeGoals !== null && match.awayGoals !== null);

            playedMatches.forEach(match => {
                const homeTeam = standings.find(team => team.teamId === match.homeTeam);
                const awayTeam = standings.find(team => team.teamId === match.awayTeam);

                if (homeTeam && awayTeam) {
                    const points = this.tournament.calculatePoints(match);
                    
                    // Update home team
                    homeTeam.played += 1;
                    homeTeam.goalsFor += match.homeGoals;
                    homeTeam.goalsAgainst += match.awayGoals;
                    homeTeam.points += points.homePoints;

                    // Update away team
                    awayTeam.played += 1;
                    awayTeam.goalsFor += match.awayGoals;
                    awayTeam.goalsAgainst += match.homeGoals;
                    awayTeam.points += points.awayPoints;

                    // Update match results
                    if (points.result === 'home_win') {
                        homeTeam.won += 1;
                        awayTeam.lost += 1;
                        homeTeam.form.push('W');
                        awayTeam.form.push('L');
                    } else if (points.result === 'away_win') {
                        awayTeam.won += 1;
                        homeTeam.lost += 1;
                        awayTeam.form.push('W');
                        homeTeam.form.push('L');
                    } else if (points.result === 'draw') {
                        homeTeam.drawn += 1;
                        awayTeam.drawn += 1;
                        homeTeam.form.push('D');
                        awayTeam.form.push('D');
                    }

                    // Keep only last 5 matches in form
                    if (homeTeam.form.length > 5) {
                        homeTeam.form = homeTeam.form.slice(-5);
                    }
                    if (awayTeam.form.length > 5) {
                        awayTeam.form = awayTeam.form.slice(-5);
                    }
                }
            });

            // Calculate goal difference
            standings.forEach(team => {
                team.goalDifference = team.goalsFor - team.goalsAgainst;
            });

            // Apply tie-breaking rules and sort
            const sortedStandings = this.applyTieBreakers(standings);

            // Determine qualification status
            return this.determineQualification(sortedStandings);

        } catch (error) {
            console.error('Error calculating standings:', error);
            return [];
        }
    }

    /**
     * Apply tie-breaking logic: Points → Goal Difference → Goals Scored
     */
    applyTieBreakers(teams) {
        try {
            return [...teams].sort((a, b) => {
                // Primary: Points (descending)
                if (b.points !== a.points) {
                    return b.points - a.points;
                }

                // Secondary: Goal Difference (descending)
                if (b.goalDifference !== a.goalDifference) {
                    return b.goalDifference - a.goalDifference;
                }

                // Tertiary: Goals Scored (descending)
                if (b.goalsFor !== a.goalsFor) {
                    return b.goalsFor - a.goalsFor;
                }

                // Quaternary: Goals Conceded (ascending - fewer goals conceded is better)
                if (a.goalsAgainst !== b.goalsAgainst) {
                    return a.goalsAgainst - b.goalsAgainst;
                }

                // Final: Alphabetical by team name
                return a.teamName.localeCompare(b.teamName, 'ar');
            });
        } catch (error) {
            console.error('Error applying tie-breakers:', error);
            return teams;
        }
    }

    /**
     * Determine qualification status for playoffs
     */
    determineQualification(sortedStandings) {
        try {
            return sortedStandings.map((team, index) => ({
                ...team,
                position: index + 1,
                qualified: index < this.playoffQualifiers,
                qualificationStatus: this.getQualificationStatus(index + 1)
            }));
        } catch (error) {
            console.error('Error determining qualification:', error);
            return sortedStandings;
        }
    }

    /**
     * Get qualification status text
     */
    getQualificationStatus(position) {
        if (position <= this.playoffQualifiers) {
            const statusMap = {
                1: 'مؤهل للنهائيات - المركز الأول',
                2: 'مؤهل للنهائيات - المركز الثاني',
                3: 'مؤهل للنهائيات - المركز الثالث',
                4: 'مؤهل للنهائيات - المركز الرابع'
            };
            return statusMap[position] || 'مؤهل للنهائيات';
        }
        return 'خارج التأهل';
    }

    /**
     * Get team position in standings
     */
    getTeamPosition(teamId) {
        try {
            const standings = this.calculateStandings();
            const team = standings.find(team => team.teamId === teamId);
            return team ? team.position : null;
        } catch (error) {
            console.error('Error getting team position:', error);
            return null;
        }
    }

    /**
     * Get top N teams
     */
    getTopTeams(count = 4) {
        try {
            const standings = this.calculateStandings();
            return standings.slice(0, count);
        } catch (error) {
            console.error('Error getting top teams:', error);
            return [];
        }
    }

    /**
     * Get qualified teams for playoffs
     */
    getQualifiedTeams() {
        try {
            const standings = this.calculateStandings();
            return standings.filter(team => team.qualified);
        } catch (error) {
            console.error('Error getting qualified teams:', error);
            return [];
        }
    }

    /**
     * Get eliminated teams
     */
    getEliminatedTeams() {
        try {
            const standings = this.calculateStandings();
            return standings.filter(team => !team.qualified);
        } catch (error) {
            console.error('Error getting eliminated teams:', error);
            return [];
        }
    }

    /**
     * Calculate standings for a specific matchday
     */
    getStandingsAfterMatchday(day) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            // Filter matches up to the specified day
            const matchesUpToDay = {
                matches: matchesData.matches.filter(match => 
                    match.day <= day && match.status === 'played' &&
                    match.homeGoals !== null && match.awayGoals !== null
                )
            };

            return this.calculateStandings(matchesUpToDay);
        } catch (error) {
            console.error('Error calculating standings for matchday:', error);
            return [];
        }
    }

    /**
     * Get standings comparison between two matchdays
     */
    getStandingsComparison(fromDay, toDay) {
        try {
            const fromStandings = this.getStandingsAfterMatchday(fromDay);
            const toStandings = this.getStandingsAfterMatchday(toDay);

            return fromStandings.map(fromTeam => {
                const toTeam = toStandings.find(team => team.teamId === fromTeam.teamId);
                
                return {
                    teamId: fromTeam.teamId,
                    teamName: fromTeam.teamName,
                    fromPosition: fromTeam.position,
                    toPosition: toTeam ? toTeam.position : fromTeam.position,
                    positionChange: fromTeam.position - (toTeam ? toTeam.position : fromTeam.position),
                    pointsChange: (toTeam ? toTeam.points : 0) - fromTeam.points
                };
            });
        } catch (error) {
            console.error('Error getting standings comparison:', error);
            return [];
        }
    }

    /**
     * Get team statistics with additional calculations
     */
    getTeamStats(teamId) {
        try {
            const standings = this.calculateStandings();
            const team = standings.find(team => team.teamId === teamId);
            
            if (!team) {
                return null;
            }

            // Calculate additional statistics
            const winPercentage = team.played > 0 ? ((team.won / team.played) * 100).toFixed(1) : 0;
            const pointsPerGame = team.played > 0 ? (team.points / team.played).toFixed(2) : 0;
            const goalsPerGame = team.played > 0 ? (team.goalsFor / team.played).toFixed(2) : 0;
            const concededPerGame = team.played > 0 ? (team.goalsAgainst / team.played).toFixed(2) : 0;

            return {
                ...team,
                winPercentage: parseFloat(winPercentage),
                pointsPerGame: parseFloat(pointsPerGame),
                goalsPerGame: parseFloat(goalsPerGame),
                concededPerGame: parseFloat(concededPerGame),
                cleanSheets: this.getCleanSheets(teamId),
                biggestWin: this.getBiggestWin(teamId),
                biggestLoss: this.getBiggestLoss(teamId)
            };
        } catch (error) {
            console.error('Error getting team stats:', error);
            return null;
        }
    }

    /**
     * Get clean sheets count for a team
     */
    getCleanSheets(teamId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return 0;
            }

            const playedMatches = matchesData.matches.filter(match => 
                match.status === 'played' && 
                (match.homeTeam === teamId || match.awayTeam === teamId) &&
                match.homeGoals !== null && match.awayGoals !== null
            );

            return playedMatches.filter(match => {
                if (match.homeTeam === teamId) {
                    return match.awayGoals === 0;
                } else {
                    return match.homeGoals === 0;
                }
            }).length;
        } catch (error) {
            console.error('Error getting clean sheets:', error);
            return 0;
        }
    }

    /**
     * Get biggest win for a team
     */
    getBiggestWin(teamId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return null;
            }

            const playedMatches = matchesData.matches.filter(match => 
                match.status === 'played' && 
                (match.homeTeam === teamId || match.awayTeam === teamId) &&
                match.homeGoals !== null && match.awayGoals !== null
            );

            let biggestWin = null;
            let maxMargin = -1;

            playedMatches.forEach(match => {
                let margin = 0;
                let isWin = false;

                if (match.homeTeam === teamId && match.homeGoals > match.awayGoals) {
                    margin = match.homeGoals - match.awayGoals;
                    isWin = true;
                } else if (match.awayTeam === teamId && match.awayGoals > match.homeGoals) {
                    margin = match.awayGoals - match.homeGoals;
                    isWin = true;
                }

                if (isWin && margin > maxMargin) {
                    maxMargin = margin;
                    biggestWin = {
                        matchId: match.id,
                        opponent: match.homeTeam === teamId ? match.awayTeam : match.homeTeam,
                        score: `${match.homeGoals}-${match.awayGoals}`,
                        margin: margin,
                        day: match.day
                    };
                }
            });

            return biggestWin;
        } catch (error) {
            console.error('Error getting biggest win:', error);
            return null;
        }
    }

    /**
     * Get biggest loss for a team
     */
    getBiggestLoss(teamId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return null;
            }

            const playedMatches = matchesData.matches.filter(match => 
                match.status === 'played' && 
                (match.homeTeam === teamId || match.awayTeam === teamId) &&
                match.homeGoals !== null && match.awayGoals !== null
            );

            let biggestLoss = null;
            let maxMargin = -1;

            playedMatches.forEach(match => {
                let margin = 0;
                let isLoss = false;

                if (match.homeTeam === teamId && match.homeGoals < match.awayGoals) {
                    margin = match.awayGoals - match.homeGoals;
                    isLoss = true;
                } else if (match.awayTeam === teamId && match.awayGoals < match.homeGoals) {
                    margin = match.homeGoals - match.awayGoals;
                    isLoss = true;
                }

                if (isLoss && margin > maxMargin) {
                    maxMargin = margin;
                    biggestLoss = {
                        matchId: match.id,
                        opponent: match.homeTeam === teamId ? match.awayTeam : match.homeTeam,
                        score: `${match.homeGoals}-${match.awayGoals}`,
                        margin: margin,
                        day: match.day
                    };
                }
            });

            return biggestLoss;
        } catch (error) {
            console.error('Error getting biggest loss:', error);
            return null;
        }
    }

    /**
     * Get league statistics
     */
    getLeagueStats() {
        try {
            const standings = this.calculateStandings();
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            
            if (!matchesData) {
                throw new Error('Failed to load matches data');
            }

            const playedMatches = matchesData.matches.filter(match => 
                match.status === 'played' && 
                match.homeGoals !== null && match.awayGoals !== null
            );

            let totalGoals = 0;
            let homeWins = 0;
            let awayWins = 0;
            let draws = 0;

            playedMatches.forEach(match => {
                totalGoals += match.homeGoals + match.awayGoals;
                
                if (match.homeGoals > match.awayGoals) {
                    homeWins++;
                } else if (match.awayGoals > match.homeGoals) {
                    awayWins++;
                } else {
                    draws++;
                }
            });

            const topScorer = this.getTopScorer();
            const mostGoalsConceded = standings.reduce((max, team) => 
                team.goalsAgainst > max.goalsAgainst ? team : max, standings[0]);
            const bestDefense = standings.reduce((min, team) => 
                team.goalsAgainst < min.goalsAgainst ? team : min, standings[0]);

            return {
                totalMatches: matchesData.matches.length,
                playedMatches: playedMatches.length,
                remainingMatches: matchesData.matches.length - playedMatches.length,
                totalGoals: totalGoals,
                averageGoalsPerMatch: playedMatches.length > 0 ? (totalGoals / playedMatches.length).toFixed(2) : 0,
                homeWins: homeWins,
                awayWins: awayWins,
                draws: draws,
                homeWinPercentage: playedMatches.length > 0 ? ((homeWins / playedMatches.length) * 100).toFixed(1) : 0,
                awayWinPercentage: playedMatches.length > 0 ? ((awayWins / playedMatches.length) * 100).toFixed(1) : 0,
                drawPercentage: playedMatches.length > 0 ? ((draws / playedMatches.length) * 100).toFixed(1) : 0,
                topScorer: topScorer,
                bestAttack: standings[0], // Team with most goals
                bestDefense: bestDefense,
                worstDefense: mostGoalsConceded
            };
        } catch (error) {
            console.error('Error getting league stats:', error);
            return null;
        }
    }

    /**
     * Get top scorer (placeholder - would need player data)
     */
    getTopScorer() {
        // This would require individual player statistics
        // For now, return placeholder
        return {
            name: 'سيتم تحديثه قريباً',
            team: '',
            goals: 0
        };
    }

    /**
     * Force recalculation and update stored team statistics
     */
    updateStoredStatistics() {
        try {
            const standings = this.calculateStandings();
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            
            if (!teamsData) {
                throw new Error('Failed to load teams data');
            }

            // Update team statistics in storage
            standings.forEach(standingTeam => {
                const team = teamsData.teams.find(team => team.id === standingTeam.teamId);
                if (team) {
                    team.statistics = {
                        played: standingTeam.played,
                        won: standingTeam.won,
                        drawn: standingTeam.drawn,
                        lost: standingTeam.lost,
                        goalsFor: standingTeam.goalsFor,
                        goalsAgainst: standingTeam.goalsAgainst,
                        points: standingTeam.points
                    };
                }
            });

            // Save updated teams data
            const saved = this.storage.save(this.storage.keys.TEAMS, teamsData);
            if (!saved) {
                throw new Error('Failed to save updated statistics');
            }

            return true;
        } catch (error) {
            console.error('Error updating stored statistics:', error);
            return false;
        }
    }
}

export default StandingsCalculator;