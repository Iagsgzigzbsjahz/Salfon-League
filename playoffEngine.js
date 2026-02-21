/**
 * Playoff System Engine for Salfoon Ramadan League Platform
 * Handles playoff bracket generation, match management, and tournament progression
 */

import LocalStorageManager from './storage.js';
import StandingsEngine from './standingsEngine.js';

class PlayoffEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.standings = new StandingsEngine();
        this.playoffMatches = [];
        this.bracketStructure = null;
    }

    /**
     * Generate playoff bracket from current standings
     */
    generatePlayoffBracket() {
        try {
            const currentStandings = this.standings.calculateStandings();
            
            if (!currentStandings || currentStandings.length < 4) {
                throw new Error('Need at least 4 teams to generate playoff bracket');
            }

            // Get top 4 teams
            const qualifiedTeams = currentStandings.slice(0, 4);
            
            // Validate that all teams have played enough matches
            const minMatchesRequired = 6; // Each team should play at least 6 matches
            const insufficientMatches = qualifiedTeams.filter(team => team.played < minMatchesRequired);
            
            if (insufficientMatches.length > 0) {
                console.warn('Some teams have not played enough matches for playoffs');
            }

            // Create bracket structure
            this.bracketStructure = {
                semifinals: [
                    {
                        id: 'semi-1',
                        matchName: 'نصف النهائي الأول',
                        homeTeam: {
                            id: qualifiedTeams[0].teamId,
                            name: this.getTeamName(qualifiedTeams[0].teamId),
                            seed: 1,
                            stats: qualifiedTeams[0]
                        },
                        awayTeam: {
                            id: qualifiedTeams[3].teamId,
                            name: this.getTeamName(qualifiedTeams[3].teamId),
                            seed: 4,
                            stats: qualifiedTeams[3]
                        },
                        status: 'scheduled',
                        homeGoals: null,
                        awayGoals: null,
                        winner: null,
                        matchDate: null,
                        venue: 'ملعب سالفون الرئيسي'
                    },
                    {
                        id: 'semi-2',
                        matchName: 'نصف النهائي الثاني',
                        homeTeam: {
                            id: qualifiedTeams[1].teamId,
                            name: this.getTeamName(qualifiedTeams[1].teamId),
                            seed: 2,
                            stats: qualifiedTeams[1]
                        },
                        awayTeam: {
                            id: qualifiedTeams[2].teamId,
                            name: this.getTeamName(qualifiedTeams[2].teamId),
                            seed: 3,
                            stats: qualifiedTeams[2]
                        },
                        status: 'scheduled',
                        homeGoals: null,
                        awayGoals: null,
                        winner: null,
                        matchDate: null,
                        venue: 'ملعب سالفون الرئيسي'
                    }
                ],
                final: {
                    id: 'final',
                    matchName: 'المباراة النهائية',
                    homeTeam: null, // Will be filled after semifinals
                    awayTeam: null, // Will be filled after semifinals
                    status: 'pending',
                    homeGoals: null,
                    awayGoals: null,
                    winner: null,
                    champion: null,
                    runnerUp: null,
                    matchDate: null,
                    venue: 'ملعب سالفون الرئيسي'
                },
                thirdPlace: {
                    id: 'third-place',
                    matchName: 'مباراة المركز الثالث',
                    homeTeam: null, // Loser of semi-1
                    awayTeam: null, // Loser of semi-2
                    status: 'pending',
                    homeGoals: null,
                    awayGoals: null,
                    winner: null,
                    matchDate: null,
                    venue: 'ملعب سالفون الرئيسي'
                },
                metadata: {
                    generated: new Date().toISOString(),
                    qualifiedTeams: qualifiedTeams,
                    tournamentPhase: 'playoffs',
                    bracketType: '1v4_2v3'
                }
            };

            // Save bracket to storage
            this.saveBracket();

            return this.bracketStructure;

        } catch (error) {
            console.error('Error generating playoff bracket:', error);
            return null;
        }
    }

    /**
     * Update semifinal match result
     */
    updateSemifinalResult(matchId, homeGoals, awayGoals, extraTimeGoals = null, penaltyResult = null) {
        try {
            if (!this.bracketStructure) {
                this.loadBracket();
            }

            const semifinal = this.bracketStructure.semifinals.find(match => match.id === matchId);
            if (!semifinal) {
                throw new Error(`Semifinal match ${matchId} not found`);
            }

            // Update match result
            semifinal.homeGoals = parseInt(homeGoals);
            semifinal.awayGoals = parseInt(awayGoals);
            semifinal.status = 'completed';

            // Determine winner
            let winner, loser;
            if (semifinal.homeGoals > semifinal.awayGoals) {
                winner = semifinal.homeTeam;
                loser = semifinal.awayTeam;
            } else if (semifinal.awayGoals > semifinal.homeGoals) {
                winner = semifinal.awayTeam;
                loser = semifinal.homeTeam;
            } else {
                // Handle draw - need penalty shootout or extra time
                if (penaltyResult) {
                    semifinal.penaltyResult = penaltyResult;
                    winner = penaltyResult.winner === 'home' ? semifinal.homeTeam : semifinal.awayTeam;
                    loser = penaltyResult.winner === 'home' ? semifinal.awayTeam : semifinal.homeTeam;
                } else {
                    throw new Error('Draw result requires penalty shootout result');
                }
            }

            semifinal.winner = winner;
            semifinal.loser = loser;

            // Update final and third place matches
            this.updateBracketProgression();

            // Save updated bracket
            this.saveBracket();

            return semifinal;

        } catch (error) {
            console.error('Error updating semifinal result:', error);
            return null;
        }
    }

    /**
     * Update final match result
     */
    updateFinalResult(homeGoals, awayGoals, extraTimeGoals = null, penaltyResult = null) {
        try {
            if (!this.bracketStructure || !this.bracketStructure.final.homeTeam) {
                throw new Error('Final match not ready or bracket not generated');
            }

            const final = this.bracketStructure.final;

            // Update match result
            final.homeGoals = parseInt(homeGoals);
            final.awayGoals = parseInt(awayGoals);
            final.status = 'completed';

            // Determine champion and runner-up
            let champion, runnerUp;
            if (final.homeGoals > final.awayGoals) {
                champion = final.homeTeam;
                runnerUp = final.awayTeam;
            } else if (final.awayGoals > final.homeGoals) {
                champion = final.awayTeam;
                runnerUp = final.homeTeam;
            } else {
                // Handle draw - need penalty shootout
                if (penaltyResult) {
                    final.penaltyResult = penaltyResult;
                    champion = penaltyResult.winner === 'home' ? final.homeTeam : final.awayTeam;
                    runnerUp = penaltyResult.winner === 'home' ? final.awayTeam : final.homeTeam;
                } else {
                    throw new Error('Final draw requires penalty shootout result');
                }
            }

            final.winner = champion;
            final.champion = champion;
            final.runnerUp = runnerUp;

            // Update tournament metadata
            this.bracketStructure.metadata.tournamentPhase = 'completed';
            this.bracketStructure.metadata.champion = champion;
            this.bracketStructure.metadata.runnerUp = runnerUp;
            this.bracketStructure.metadata.completedDate = new Date().toISOString();

            // Save updated bracket
            this.saveBracket();

            return final;

        } catch (error) {
            console.error('Error updating final result:', error);
            return null;
        }
    }

    /**
     * Update bracket progression after semifinal results
     */
    updateBracketProgression() {
        const semi1 = this.bracketStructure.semifinals[0];
        const semi2 = this.bracketStructure.semifinals[1];

        // Update final if both semifinals are completed
        if (semi1.winner && semi2.winner) {
            this.bracketStructure.final.homeTeam = semi1.winner;
            this.bracketStructure.final.awayTeam = semi2.winner;
            this.bracketStructure.final.status = 'scheduled';
        }

        // Update third place match if both semifinals are completed
        if (semi1.loser && semi2.loser) {
            this.bracketStructure.thirdPlace.homeTeam = semi1.loser;
            this.bracketStructure.thirdPlace.awayTeam = semi2.loser;
            this.bracketStructure.thirdPlace.status = 'scheduled';
        }
    }

    /**
     * Get current tournament phase
     */
    getTournamentPhase() {
        try {
            // Check if group stage is complete
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) return 'not_started';

            const totalGroupMatches = matchesData.matches.length;
            const completedGroupMatches = matchesData.matches.filter(match => match.status === 'played').length;

            if (completedGroupMatches < totalGroupMatches) {
                return 'group_stage';
            }

            // Check playoff status
            if (!this.bracketStructure) {
                this.loadBracket();
            }

            if (!this.bracketStructure) {
                return 'playoffs_pending';
            }

            const semi1 = this.bracketStructure.semifinals[0];
            const semi2 = this.bracketStructure.semifinals[1];
            const final = this.bracketStructure.final;

            if (final.status === 'completed') {
                return 'tournament_completed';
            } else if (final.status === 'scheduled') {
                return 'final_scheduled';
            } else if (semi1.status === 'completed' && semi2.status === 'completed') {
                return 'semifinals_completed';
            } else if (semi1.status === 'scheduled' || semi2.status === 'scheduled') {
                return 'semifinals_in_progress';
            } else {
                return 'playoffs_ready';
            }

        } catch (error) {
            console.error('Error getting tournament phase:', error);
            return 'unknown';
        }
    }

    /**
     * Get playoff bracket for display
     */
    getPlayoffBracket() {
        if (!this.bracketStructure) {
            this.loadBracket();
        }
        return this.bracketStructure;
    }

    /**
     * Get tournament summary
     */
    getTournamentSummary() {
        try {
            const phase = this.getTournamentPhase();
            const bracket = this.getPlayoffBracket();
            
            let summary = {
                phase: phase,
                groupStageComplete: phase !== 'group_stage' && phase !== 'not_started',
                playoffsGenerated: bracket !== null,
                semifinalsComplete: false,
                finalComplete: false,
                champion: null,
                runnerUp: null,
                thirdPlace: null
            };

            if (bracket) {
                const semi1 = bracket.semifinals[0];
                const semi2 = bracket.semifinals[1];
                const final = bracket.final;
                const thirdPlace = bracket.thirdPlace;

                summary.semifinalsComplete = semi1.status === 'completed' && semi2.status === 'completed';
                summary.finalComplete = final.status === 'completed';

                if (final.champion) {
                    summary.champion = final.champion;
                    summary.runnerUp = final.runnerUp;
                }

                if (thirdPlace && thirdPlace.winner) {
                    summary.thirdPlace = thirdPlace.winner;
                }
            }

            return summary;

        } catch (error) {
            console.error('Error getting tournament summary:', error);
            return null;
        }
    }

    /**
     * Reset playoff bracket (for testing/admin)
     */
    resetPlayoffs() {
        try {
            this.bracketStructure = null;
            this.storage.remove('salfoon_playoffs');
            return true;
        } catch (error) {
            console.error('Error resetting playoffs:', error);
            return false;
        }
    }

    /**
     * Save bracket to storage
     */
    saveBracket() {
        try {
            this.storage.save('salfoon_playoffs', this.bracketStructure);
        } catch (error) {
            console.error('Error saving bracket:', error);
        }
    }

    /**
     * Load bracket from storage
     */
    loadBracket() {
        try {
            this.bracketStructure = this.storage.load('salfoon_playoffs');
        } catch (error) {
            console.error('Error loading bracket:', error);
            this.bracketStructure = null;
        }
    }

    /**
     * Get team name by ID
     */
    getTeamName(teamId) {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (!teamsData) return teamId;

            const team = teamsData.teams.find(t => t.id === teamId);
            return team ? team.name : teamId;
        } catch (error) {
            console.error('Error getting team name:', error);
            return teamId;
        }
    }

    /**
     * Validate playoff eligibility
     */
    validatePlayoffEligibility() {
        try {
            const currentStandings = this.standings.calculateStandings();
            
            if (!currentStandings || currentStandings.length < 4) {
                return {
                    eligible: false,
                    reason: 'Need at least 4 teams for playoffs'
                };
            }

            // Check if group stage is complete
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            if (!matchesData) {
                return {
                    eligible: false,
                    reason: 'No match data available'
                };
            }

            const totalMatches = matchesData.matches.length;
            const completedMatches = matchesData.matches.filter(match => match.status === 'played').length;
            const completionPercentage = (completedMatches / totalMatches) * 100;

            if (completionPercentage < 80) {
                return {
                    eligible: false,
                    reason: `Group stage only ${completionPercentage.toFixed(1)}% complete. Need at least 80% completion for playoffs.`,
                    completionPercentage: completionPercentage
                };
            }

            return {
                eligible: true,
                completionPercentage: completionPercentage,
                qualifiedTeams: currentStandings.slice(0, 4)
            };

        } catch (error) {
            console.error('Error validating playoff eligibility:', error);
            return {
                eligible: false,
                reason: 'Error validating eligibility: ' + error.message
            };
        }
    }

    /**
     * Generate playoff schedule with dates
     */
    generatePlayoffSchedule(startDate) {
        try {
            if (!this.bracketStructure) {
                throw new Error('Playoff bracket not generated');
            }

            const schedule = [];
            const baseDate = new Date(startDate);

            // Schedule semifinals (2 days apart)
            this.bracketStructure.semifinals[0].matchDate = new Date(baseDate);
            this.bracketStructure.semifinals[1].matchDate = new Date(baseDate.getTime() + (2 * 24 * 60 * 60 * 1000));

            // Schedule third place match (4 days after first semifinal)
            this.bracketStructure.thirdPlace.matchDate = new Date(baseDate.getTime() + (4 * 24 * 60 * 60 * 1000));

            // Schedule final (6 days after first semifinal)
            this.bracketStructure.final.matchDate = new Date(baseDate.getTime() + (6 * 24 * 60 * 60 * 1000));

            this.saveBracket();

            return {
                semifinals: this.bracketStructure.semifinals.map(match => ({
                    id: match.id,
                    name: match.matchName,
                    date: match.matchDate,
                    teams: `${match.homeTeam.name} × ${match.awayTeam.name}`
                })),
                thirdPlace: {
                    id: this.bracketStructure.thirdPlace.id,
                    name: this.bracketStructure.thirdPlace.matchName,
                    date: this.bracketStructure.thirdPlace.matchDate
                },
                final: {
                    id: this.bracketStructure.final.id,
                    name: this.bracketStructure.final.matchName,
                    date: this.bracketStructure.final.matchDate
                }
            };

        } catch (error) {
            console.error('Error generating playoff schedule:', error);
            return null;
        }
    }
}

export default PlayoffEngine;