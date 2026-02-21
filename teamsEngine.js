/**
 * Teams Engine for Salfoon Ramadan League Platform
 * Handles team data management, profiles, and statistics
 */

import LocalStorageManager from './storage.js';
import StandingsCalculator from './standingsEngine.js';
import FixturesEngine from './fixturesEngine.js';

class TeamsEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.standingsCalculator = new StandingsCalculator();
        this.fixturesEngine = new FixturesEngine();
    }

    /**
     * Get all teams with enhanced data
     */
    getAllTeams() {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (!teamsData || !teamsData.teams) {
                return [];
            }

            // Enhance teams with current standings and fixtures
            return teamsData.teams.map(team => this.enhanceTeamData(team));

        } catch (error) {
            console.error('Error getting all teams:', error);
            return [];
        }
    }

    /**
     * Get team by ID with enhanced data
     */
    getTeam(teamId) {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (!teamsData || !teamsData.teams) {
                return null;
            }

            const team = teamsData.teams.find(t => t.id === teamId);
            return team ? this.enhanceTeamData(team) : null;

        } catch (error) {
            console.error('Error getting team:', error);
            return null;
        }
    }

    /**
     * Enhance team data with current statistics and fixtures
     */
    enhanceTeamData(team) {
        try {
            // Get current standings position
            const standings = this.standingsCalculator.calculateStandings();
            const teamStanding = standings.find(s => s.teamId === team.id);

            // Get team fixtures
            const teamFixtures = this.fixturesEngine.getFixturesByTeam(team.id);
            const nextFixture = this.fixturesEngine.getTeamNextFixture(team.id);
            const lastResult = this.fixturesEngine.getTeamLastResult(team.id);

            // Calculate additional statistics
            const additionalStats = this.calculateAdditionalStats(team.id, teamFixtures);

            return {
                ...team,
                currentPosition: teamStanding ? teamStanding.position : null,
                qualified: teamStanding ? teamStanding.qualified : false,
                qualificationStatus: teamStanding ? teamStanding.qualificationStatus : null,
                form: teamStanding ? teamStanding.form : [],
                goalDifference: teamStanding ? teamStanding.goalDifference : 0,
                fixtures: {
                    total: teamFixtures.length,
                    played: teamFixtures.filter(f => f.status === 'played').length,
                    scheduled: teamFixtures.filter(f => f.status === 'scheduled').length,
                    postponed: teamFixtures.filter(f => f.status === 'postponed').length,
                    next: nextFixture,
                    last: lastResult
                },
                additionalStats: additionalStats
            };

        } catch (error) {
            console.error('Error enhancing team data:', error);
            return team;
        }
    }

    /**
     * Calculate additional team statistics
     */
    calculateAdditionalStats(teamId, fixtures) {
        try {
            const playedFixtures = fixtures.filter(f => f.status === 'played' && 
                f.homeGoals !== null && f.awayGoals !== null);

            if (playedFixtures.length === 0) {
                return {
                    averageGoalsScored: 0,
                    averageGoalsConceded: 0,
                    cleanSheets: 0,
                    failedToScore: 0,
                    biggestWin: null,
                    biggestLoss: null,
                    homeRecord: { played: 0, won: 0, drawn: 0, lost: 0 },
                    awayRecord: { played: 0, won: 0, drawn: 0, lost: 0 },
                    scoringStreak: 0,
                    winningStreak: 0,
                    unbeatenStreak: 0
                };
            }

            let totalGoalsScored = 0;
            let totalGoalsConceded = 0;
            let cleanSheets = 0;
            let failedToScore = 0;
            let biggestWin = null;
            let biggestLoss = null;
            let maxWinMargin = -1;
            let maxLossMargin = -1;

            const homeRecord = { played: 0, won: 0, drawn: 0, lost: 0 };
            const awayRecord = { played: 0, won: 0, drawn: 0, lost: 0 };

            playedFixtures.forEach(fixture => {
                const isHome = fixture.homeTeam === teamId;
                const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
                const opponentGoals = isHome ? fixture.awayGoals : fixture.homeGoals;

                totalGoalsScored += teamGoals;
                totalGoalsConceded += opponentGoals;

                // Clean sheets and failed to score
                if (opponentGoals === 0) cleanSheets++;
                if (teamGoals === 0) failedToScore++;

                // Home/Away records
                const record = isHome ? homeRecord : awayRecord;
                record.played++;

                if (teamGoals > opponentGoals) {
                    record.won++;
                    // Check for biggest win
                    const margin = teamGoals - opponentGoals;
                    if (margin > maxWinMargin) {
                        maxWinMargin = margin;
                        biggestWin = {
                            opponent: isHome ? fixture.awayTeamInfo.name : fixture.homeTeamInfo.name,
                            score: `${fixture.homeGoals}-${fixture.awayGoals}`,
                            margin: margin,
                            day: fixture.day,
                            isHome: isHome
                        };
                    }
                } else if (teamGoals < opponentGoals) {
                    record.lost++;
                    // Check for biggest loss
                    const margin = opponentGoals - teamGoals;
                    if (margin > maxLossMargin) {
                        maxLossMargin = margin;
                        biggestLoss = {
                            opponent: isHome ? fixture.awayTeamInfo.name : fixture.homeTeamInfo.name,
                            score: `${fixture.homeGoals}-${fixture.awayGoals}`,
                            margin: margin,
                            day: fixture.day,
                            isHome: isHome
                        };
                    }
                } else {
                    record.drawn++;
                }
            });

            // Calculate streaks
            const streaks = this.calculateStreaks(teamId, playedFixtures);

            return {
                averageGoalsScored: (totalGoalsScored / playedFixtures.length).toFixed(2),
                averageGoalsConceded: (totalGoalsConceded / playedFixtures.length).toFixed(2),
                cleanSheets: cleanSheets,
                failedToScore: failedToScore,
                biggestWin: biggestWin,
                biggestLoss: biggestLoss,
                homeRecord: homeRecord,
                awayRecord: awayRecord,
                ...streaks
            };

        } catch (error) {
            console.error('Error calculating additional stats:', error);
            return {};
        }
    }

    /**
     * Calculate team streaks (winning, scoring, unbeaten)
     */
    calculateStreaks(teamId, fixtures) {
        try {
            // Sort fixtures by day (most recent first)
            const sortedFixtures = fixtures.sort((a, b) => b.day - a.day);

            let scoringStreak = 0;
            let winningStreak = 0;
            let unbeatenStreak = 0;

            for (const fixture of sortedFixtures) {
                const isHome = fixture.homeTeam === teamId;
                const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
                const opponentGoals = isHome ? fixture.awayGoals : fixture.homeGoals;

                // Scoring streak
                if (teamGoals > 0) {
                    scoringStreak++;
                } else {
                    break;
                }

                // Winning streak
                if (teamGoals > opponentGoals) {
                    winningStreak++;
                } else if (winningStreak > 0) {
                    break;
                }

                // Unbeaten streak
                if (teamGoals >= opponentGoals) {
                    unbeatenStreak++;
                } else if (unbeatenStreak > 0) {
                    break;
                }
            }

            return {
                scoringStreak,
                winningStreak,
                unbeatenStreak
            };

        } catch (error) {
            console.error('Error calculating streaks:', error);
            return {
                scoringStreak: 0,
                winningStreak: 0,
                unbeatenStreak: 0
            };
        }
    }

    /**
     * Get team head-to-head record against another team
     */
    getHeadToHeadRecord(teamId1, teamId2) {
        try {
            const fixtures = this.fixturesEngine.getAllFixtures();
            const h2hFixtures = fixtures.filter(fixture => 
                (fixture.homeTeam === teamId1 && fixture.awayTeam === teamId2) ||
                (fixture.homeTeam === teamId2 && fixture.awayTeam === teamId1)
            );

            const playedFixtures = h2hFixtures.filter(f => f.status === 'played' && 
                f.homeGoals !== null && f.awayGoals !== null);

            if (playedFixtures.length === 0) {
                return {
                    played: 0,
                    team1Wins: 0,
                    team2Wins: 0,
                    draws: 0,
                    team1Goals: 0,
                    team2Goals: 0,
                    fixtures: []
                };
            }

            let team1Wins = 0;
            let team2Wins = 0;
            let draws = 0;
            let team1Goals = 0;
            let team2Goals = 0;

            playedFixtures.forEach(fixture => {
                const team1IsHome = fixture.homeTeam === teamId1;
                const team1FixtureGoals = team1IsHome ? fixture.homeGoals : fixture.awayGoals;
                const team2FixtureGoals = team1IsHome ? fixture.awayGoals : fixture.homeGoals;

                team1Goals += team1FixtureGoals;
                team2Goals += team2FixtureGoals;

                if (team1FixtureGoals > team2FixtureGoals) {
                    team1Wins++;
                } else if (team2FixtureGoals > team1FixtureGoals) {
                    team2Wins++;
                } else {
                    draws++;
                }
            });

            return {
                played: playedFixtures.length,
                team1Wins,
                team2Wins,
                draws,
                team1Goals,
                team2Goals,
                fixtures: playedFixtures
            };

        } catch (error) {
            console.error('Error getting head-to-head record:', error);
            return null;
        }
    }

    /**
     * Get team comparison data
     */
    compareTeams(teamId1, teamId2) {
        try {
            const team1 = this.getTeam(teamId1);
            const team2 = this.getTeam(teamId2);

            if (!team1 || !team2) {
                return null;
            }

            const h2hRecord = this.getHeadToHeadRecord(teamId1, teamId2);

            return {
                team1: team1,
                team2: team2,
                headToHead: h2hRecord,
                comparison: {
                    position: {
                        team1: team1.currentPosition,
                        team2: team2.currentPosition,
                        better: team1.currentPosition < team2.currentPosition ? 'team1' : 
                               team2.currentPosition < team1.currentPosition ? 'team2' : 'equal'
                    },
                    points: {
                        team1: team1.statistics.points,
                        team2: team2.statistics.points,
                        better: team1.statistics.points > team2.statistics.points ? 'team1' : 
                               team2.statistics.points > team1.statistics.points ? 'team2' : 'equal'
                    },
                    goalDifference: {
                        team1: team1.goalDifference,
                        team2: team2.goalDifference,
                        better: team1.goalDifference > team2.goalDifference ? 'team1' : 
                               team2.goalDifference > team1.goalDifference ? 'team2' : 'equal'
                    },
                    goalsScored: {
                        team1: team1.statistics.goalsFor,
                        team2: team2.statistics.goalsFor,
                        better: team1.statistics.goalsFor > team2.statistics.goalsFor ? 'team1' : 
                               team2.statistics.goalsFor > team1.statistics.goalsFor ? 'team2' : 'equal'
                    }
                }
            };

        } catch (error) {
            console.error('Error comparing teams:', error);
            return null;
        }
    }

    /**
     * Get team performance trends
     */
    getTeamTrends(teamId, matchCount = 5) {
        try {
            const teamFixtures = this.fixturesEngine.getFixturesByTeam(teamId);
            const playedFixtures = teamFixtures
                .filter(f => f.status === 'played' && f.homeGoals !== null && f.awayGoals !== null)
                .sort((a, b) => b.day - a.day)
                .slice(0, matchCount);

            if (playedFixtures.length === 0) {
                return {
                    matches: [],
                    trends: {
                        points: [],
                        goals: [],
                        form: []
                    }
                };
            }

            const trends = {
                points: [],
                goals: [],
                form: []
            };

            playedFixtures.reverse().forEach(fixture => {
                const isHome = fixture.homeTeam === teamId;
                const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
                const opponentGoals = isHome ? fixture.awayGoals : fixture.homeGoals;

                // Points trend
                let points = 0;
                let result = 'L';
                if (teamGoals > opponentGoals) {
                    points = 3;
                    result = 'W';
                } else if (teamGoals === opponentGoals) {
                    points = 1;
                    result = 'D';
                }

                trends.points.push(points);
                trends.goals.push(teamGoals);
                trends.form.push(result);
            });

            return {
                matches: playedFixtures.reverse(),
                trends: trends
            };

        } catch (error) {
            console.error('Error getting team trends:', error);
            return null;
        }
    }

    /**
     * Get league rankings for different categories
     */
    getLeagueRankings() {
        try {
            const teams = this.getAllTeams();
            
            return {
                points: teams.sort((a, b) => b.statistics.points - a.statistics.points),
                goalsScored: teams.sort((a, b) => b.statistics.goalsFor - a.statistics.goalsFor),
                goalsConceded: teams.sort((a, b) => a.statistics.goalsAgainst - b.statistics.goalsAgainst),
                goalDifference: teams.sort((a, b) => b.goalDifference - a.goalDifference),
                cleanSheets: teams.sort((a, b) => (b.additionalStats?.cleanSheets || 0) - (a.additionalStats?.cleanSheets || 0)),
                winPercentage: teams.sort((a, b) => {
                    const aWinPct = a.statistics.played > 0 ? (a.statistics.won / a.statistics.played) : 0;
                    const bWinPct = b.statistics.played > 0 ? (b.statistics.won / b.statistics.played) : 0;
                    return bWinPct - aWinPct;
                })
            };

        } catch (error) {
            console.error('Error getting league rankings:', error);
            return null;
        }
    }

    /**
     * Get team awards and achievements
     */
    getTeamAwards(teamId) {
        try {
            const team = this.getTeam(teamId);
            if (!team) return [];

            const awards = [];
            const rankings = this.getLeagueRankings();

            // Check for various achievements
            if (team.currentPosition === 1) {
                awards.push({
                    type: 'position',
                    title: 'صدارة الترتيب',
                    description: 'يتصدر الفريق ترتيب البطولة حالياً',
                    icon: '👑'
                });
            }

            if (team.qualified) {
                awards.push({
                    type: 'qualification',
                    title: 'مؤهل للنهائيات',
                    description: 'الفريق مؤهل للأدوار النهائية',
                    icon: '🏆'
                });
            }

            // Best attack
            if (rankings.goalsScored[0]?.id === teamId) {
                awards.push({
                    type: 'attack',
                    title: 'أفضل هجوم',
                    description: `أكثر الفرق تسجيلاً للأهداف (${team.statistics.goalsFor} أهداف)`,
                    icon: '⚽'
                });
            }

            // Best defense
            if (rankings.goalsConceded[0]?.id === teamId) {
                awards.push({
                    type: 'defense',
                    title: 'أفضل دفاع',
                    description: `أقل الفرق استقبالاً للأهداف (${team.statistics.goalsAgainst} أهداف)`,
                    icon: '🛡️'
                });
            }

            // Unbeaten streak
            if (team.additionalStats?.unbeatenStreak >= 3) {
                awards.push({
                    type: 'streak',
                    title: 'سلسلة عدم الهزيمة',
                    description: `${team.additionalStats.unbeatenStreak} مباريات بدون هزيمة`,
                    icon: '🔥'
                });
            }

            // Perfect home record
            if (team.additionalStats?.homeRecord?.played > 0 && 
                team.additionalStats.homeRecord.lost === 0) {
                awards.push({
                    type: 'home',
                    title: 'قلعة حصينة',
                    description: 'لم يخسر أي مباراة على أرضه',
                    icon: '🏠'
                });
            }

            return awards;

        } catch (error) {
            console.error('Error getting team awards:', error);
            return [];
        }
    }

    /**
     * Update team information (admin function)
     */
    updateTeam(teamId, updates) {
        try {
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            if (!teamsData || !teamsData.teams) {
                return {
                    success: false,
                    error: 'Failed to load teams data'
                };
            }

            const teamIndex = teamsData.teams.findIndex(team => team.id === teamId);
            if (teamIndex === -1) {
                return {
                    success: false,
                    error: 'Team not found'
                };
            }

            // Update allowed fields
            const allowedFields = ['name', 'shortName', 'logo', 'founded', 'colors', 'squad'];
            const team = teamsData.teams[teamIndex];

            allowedFields.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    team[field] = updates[field];
                }
            });

            // Save updated data
            const saved = this.storage.save(this.storage.keys.TEAMS, teamsData);
            if (!saved) {
                return {
                    success: false,
                    error: 'Failed to save team updates'
                };
            }

            return {
                success: true,
                team: team
            };

        } catch (error) {
            console.error('Error updating team:', error);
            return {
                success: false,
                error: 'Error updating team'
            };
        }
    }

    /**
     * Get team statistics summary
     */
    getTeamStatsSummary() {
        try {
            const teams = this.getAllTeams();
            
            return {
                totalTeams: teams.length,
                teamsWithMatches: teams.filter(t => t.statistics.played > 0).length,
                qualifiedTeams: teams.filter(t => t.qualified).length,
                averageGoalsPerTeam: teams.reduce((sum, t) => sum + t.statistics.goalsFor, 0) / teams.length,
                topScorer: teams.reduce((top, team) => 
                    team.statistics.goalsFor > top.statistics.goalsFor ? team : top, teams[0]),
                bestDefense: teams.reduce((best, team) => 
                    team.statistics.goalsAgainst < best.statistics.goalsAgainst ? team : best, teams[0])
            };

        } catch (error) {
            console.error('Error getting team stats summary:', error);
            return null;
        }
    }

    /**
     * Export team data
     */
    exportTeamData(format = 'json') {
        try {
            const teams = this.getAllTeams();
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(teams, null, 2);
                
                case 'csv':
                    return this.exportToCSV(teams);
                
                default:
                    throw new Error('Unsupported export format');
            }
        } catch (error) {
            console.error('Error exporting team data:', error);
            return null;
        }
    }

    /**
     * Export teams to CSV format
     */
    exportToCSV(teams) {
        const headers = [
            'الفريق', 'المركز', 'لعب', 'فوز', 'تعادل', 'خسارة', 
            'له', 'عليه', 'الفارق', 'النقاط', 'مؤهل'
        ];
        
        const rows = teams.map(team => [
            team.name,
            team.currentPosition || '-',
            team.statistics.played,
            team.statistics.won,
            team.statistics.drawn,
            team.statistics.lost,
            team.statistics.goalsFor,
            team.statistics.goalsAgainst,
            team.goalDifference,
            team.statistics.points,
            team.qualified ? 'نعم' : 'لا'
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

export default TeamsEngine;