/**
 * Tournament System Engine for Salfoon Ramadan League Platform
 * Manages tournament structure, point calculation, and playoff qualification
 */

import LocalStorageManager from './storage.js';

class TournamentSystem {
    constructor() {
        this.storage = new LocalStorageManager();
        this.pointsSystem = {
            win: 3,
            draw: 1,
            loss: 0
        };
        this.maxTeams = 7;
        this.playoffQualifiers = 4;
    }

    /**
     * Validate tournament structure
     */
    validateTournamentStructure() {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            const matchesData = this.storage.load(this.storage.keys.MATCHES);

            if (!teamsData || !matchesData) {
                throw new Error('Missing tournament data');
            }

            // Validate team count
            if (teamsData.teams.length !== this.maxTeams) {
                throw new Error(`Tournament must have exactly ${this.maxTeams} teams`);
            }

            // Validate match count (round-robin: n*(n-1)/2 matches)
            const expectedMatches = (this.maxTeams * (this.maxTeams - 1)) / 2;
            if (matchesData.matches.length !== expectedMatches) {
                throw new Error(`Tournament must have exactly ${expectedMatches} matches for round-robin format`);
            }

            // Validate each team plays against every other team exactly once
            const teamIds = teamsData.teams.map(team => team.id);
            const matchPairs = new Set();

            matchesData.matches.forEach(match => {
                const pair1 = `${match.homeTeam}-${match.awayTeam}`;
                const pair2 = `${match.awayTeam}-${match.homeTeam}`;
                
                if (matchPairs.has(pair1) || matchPairs.has(pair2)) {
                    throw new Error('Duplicate match found in tournament structure');
                }
                
                matchPairs.add(pair1);

                // Validate teams exist
                if (!teamIds.includes(match.homeTeam) || !teamIds.includes(match.awayTeam)) {
                    throw new Error('Match contains invalid team ID');
                }
            });

            // Validate each team has correct number of matches
            teamIds.forEach(teamId => {
                const teamMatches = matchesData.matches.filter(match => 
                    match.homeTeam === teamId || match.awayTeam === teamId
                );
                
                if (teamMatches.length !== this.maxTeams - 1) {
                    throw new Error(`Team ${teamId} has incorrect number of matches`);
                }
            });

            return {
                valid: true,
                teams: teamsData.teams.length,
                matches: matchesData.matches.length,
                structure: 'round-robin'
            };

        } catch (error) {
            console.error('Tournament structure validation failed:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate points for a match result
     */
    calculatePoints(matchResult) {
        try {
            if (!matchResult || matchResult.homeGoals === null || matchResult.awayGoals === null) {
                return {
                    homePoints: 0,
                    awayPoints: 0,
                    result: 'not_played'
                };
            }

            const homeGoals = parseInt(matchResult.homeGoals);
            const awayGoals = parseInt(matchResult.awayGoals);

            if (homeGoals > awayGoals) {
                return {
                    homePoints: this.pointsSystem.win,
                    awayPoints: this.pointsSystem.loss,
                    result: 'home_win'
                };
            } else if (awayGoals > homeGoals) {
                return {
                    homePoints: this.pointsSystem.loss,
                    awayPoints: this.pointsSystem.win,
                    result: 'away_win'
                };
            } else {
                return {
                    homePoints: this.pointsSystem.draw,
                    awayPoints: this.pointsSystem.draw,
                    result: 'draw'
                };
            }
        } catch (error) {
            console.error('Error calculating points:', error);
            return {
                homePoints: 0,
                awayPoints: 0,
                result: 'error'
            };
        }
    }

    /**
     * Determine playoff qualification based on standings
     */
    determinePlayoffQualification(standings) {
        try {
            if (!standings || !Array.isArray(standings)) {
                throw new Error('Invalid standings data');
            }

            // Sort standings by points, then goal difference, then goals scored
            const sortedStandings = [...standings].sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                if (b.goalDifference !== a.goalDifference) {
                    return b.goalDifference - a.goalDifference;
                }
                return b.goalsFor - a.goalsFor;
            });

            // Mark top 4 teams as qualified
            const qualifiedTeams = sortedStandings.slice(0, this.playoffQualifiers);
            const eliminatedTeams = sortedStandings.slice(this.playoffQualifiers);

            return {
                qualified: qualifiedTeams.map((team, index) => ({
                    ...team,
                    position: index + 1,
                    qualified: true,
                    playoffSeed: index + 1
                })),
                eliminated: eliminatedTeams.map((team, index) => ({
                    ...team,
                    position: this.playoffQualifiers + index + 1,
                    qualified: false,
                    playoffSeed: null
                })),
                playoffBracket: this.generatePlayoffBracket(qualifiedTeams)
            };
        } catch (error) {
            console.error('Error determining playoff qualification:', error);
            return {
                qualified: [],
                eliminated: [],
                playoffBracket: null,
                error: error.message
            };
        }
    }

    /**
     * Generate playoff bracket (1st vs 4th, 2nd vs 3rd)
     */
    generatePlayoffBracket(qualifiedTeams) {
        try {
            if (!qualifiedTeams || qualifiedTeams.length < 4) {
                throw new Error('Need at least 4 qualified teams for playoffs');
            }

            const bracket = {
                semifinals: [
                    {
                        id: 'semi-1',
                        homeTeam: qualifiedTeams[0], // 1st place
                        awayTeam: qualifiedTeams[3], // 4th place
                        matchName: 'نصف النهائي الأول',
                        winner: null
                    },
                    {
                        id: 'semi-2',
                        homeTeam: qualifiedTeams[1], // 2nd place
                        awayTeam: qualifiedTeams[2], // 3rd place
                        matchName: 'نصف النهائي الثاني',
                        winner: null
                    }
                ],
                final: {
                    id: 'final',
                    homeTeam: null, // Winner of semi-1
                    awayTeam: null, // Winner of semi-2
                    matchName: 'المباراة النهائية',
                    winner: null
                }
            };

            return bracket;
        } catch (error) {
            console.error('Error generating playoff bracket:', error);
            return null;
        }
    }

    /**
     * Get current tournament phase
     */
    getCurrentPhase() {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return 'not_started';
            }

            const playedMatches = matchesData.matches.filter(match => match.status === 'played');
            const totalMatches = matchesData.matches.length;

            if (playedMatches.length === 0) {
                return 'not_started';
            } else if (playedMatches.length < totalMatches) {
                return 'group_stage';
            } else {
                return 'playoffs';
            }
        } catch (error) {
            console.error('Error getting current phase:', error);
            return 'unknown';
        }
    }

    /**
     * Get tournament statistics
     */
    getTournamentStats() {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            const teamsData = this.storage.load(this.storage.keys.TEAMS);

            if (!matchesData || !teamsData) {
                throw new Error('Missing tournament data');
            }

            const playedMatches = matchesData.matches.filter(match => match.status === 'played');
            const scheduledMatches = matchesData.matches.filter(match => match.status === 'scheduled');
            const postponedMatches = matchesData.matches.filter(match => match.status === 'postponed');

            let totalGoals = 0;
            playedMatches.forEach(match => {
                totalGoals += (match.homeGoals || 0) + (match.awayGoals || 0);
            });

            return {
                totalTeams: teamsData.teams.length,
                totalMatches: matchesData.matches.length,
                playedMatches: playedMatches.length,
                scheduledMatches: scheduledMatches.length,
                postponedMatches: postponedMatches.length,
                totalGoals: totalGoals,
                averageGoalsPerMatch: playedMatches.length > 0 ? (totalGoals / playedMatches.length).toFixed(2) : 0,
                completionPercentage: ((playedMatches.length / matchesData.matches.length) * 100).toFixed(1),
                currentPhase: this.getCurrentPhase()
            };
        } catch (error) {
            console.error('Error getting tournament stats:', error);
            return null;
        }
    }

    /**
     * Validate match day within Ramadan period (days 3-23)
     */
    validateMatchDay(day) {
        const minDay = 3;
        const maxDay = 23;
        
        if (typeof day !== 'number' || day < minDay || day > maxDay) {
            return {
                valid: false,
                error: `Match day must be between ${minDay} and ${maxDay} (Ramadan period)`
            };
        }

        return {
            valid: true,
            day: day
        };
    }

    /**
     * Get next scheduled match
     */
    getNextMatch() {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return null;
            }

            const scheduledMatches = matchesData.matches
                .filter(match => match.status === 'scheduled')
                .sort((a, b) => a.day - b.day);

            return scheduledMatches.length > 0 ? scheduledMatches[0] : null;
        } catch (error) {
            console.error('Error getting next match:', error);
            return null;
        }
    }

    /**
     * Get last played match
     */
    getLastMatch() {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return null;
            }

            const playedMatches = matchesData.matches
                .filter(match => match.status === 'played')
                .sort((a, b) => b.day - a.day);

            return playedMatches.length > 0 ? playedMatches[0] : null;
        } catch (error) {
            console.error('Error getting last match:', error);
            return null;
        }
    }

    /**
     * Reset tournament (for testing/admin purposes)
     */
    resetTournament() {
        try {
            // Reset all match results
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (matchesData) {
                matchesData.matches.forEach(match => {
                    if (match.id !== 'match-02') { // Keep the pre-loaded result
                        match.homeGoals = null;
                        match.awayGoals = null;
                        match.status = 'scheduled';
                        match.bestPlayer = null;
                        match.postponementReason = null;
                        match.lastUpdated = null;
                    }
                });
                this.storage.save(this.storage.keys.MATCHES, matchesData);
            }

            // Reset team statistics (except for teams with played matches)
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (teamsData) {
                teamsData.teams.forEach(team => {
                    if (team.id !== 'bait-shahra' && team.id !== 'may-22') {
                        team.statistics = {
                            played: 0,
                            won: 0,
                            drawn: 0,
                            lost: 0,
                            goalsFor: 0,
                            goalsAgainst: 0,
                            points: 0
                        };
                    }
                });
                this.storage.save(this.storage.keys.TEAMS, teamsData);
            }

            return true;
        } catch (error) {
            console.error('Error resetting tournament:', error);
            return false;
        }
    }
}

export default TournamentSystem;