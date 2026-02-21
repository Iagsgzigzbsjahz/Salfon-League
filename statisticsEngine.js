/**
 * Statistics Engine for Salfoon Ramadan League Platform
 * Handles player statistics, team analytics, and performance tracking
 */

import LocalStorageManager from './storage.js';
import FixturesEngine from './fixturesEngine.js';
import TeamsEngine from './teamsEngine.js';

class StatisticsEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.fixturesEngine = new FixturesEngine();
        this.teamsEngine = new TeamsEngine();
    }

    /**
     * Get comprehensive tournament statistics
     */
    getTournamentStatistics() {
        try {
            const matches = this.fixturesEngine.getAllFixtures();
            const teams = this.teamsEngine.getAllTeams();
            
            const playedMatches = matches.filter(m => m.status === 'played' && 
                m.homeGoals !== null && m.awayGoals !== null);

            if (playedMatches.length === 0) {
                return this.getEmptyStatistics();
            }

            // Basic match statistics
            let totalGoals = 0;
            let homeWins = 0;
            let awayWins = 0;
            let draws = 0;
            let highestScoringMatch = null;
            let maxGoals = 0;

            playedMatches.forEach(match => {
                const matchGoals = match.homeGoals + match.awayGoals;
                totalGoals += matchGoals;

                if (matchGoals > maxGoals) {
                    maxGoals = matchGoals;
                    highestScoringMatch = match;
                }

                if (match.homeGoals > match.awayGoals) {
                    homeWins++;
                } else if (match.awayGoals > match.homeGoals) {
                    awayWins++;
                } else {
                    draws++;
                }
            });

            // Team statistics
            const teamStats = this.calculateTeamStatistics(teams, playedMatches);
            
            // Player statistics (simulated based on match data)
            const playerStats = this.calculatePlayerStatistics(playedMatches, teams);

            return {
                matches: {
                    total: matches.length,
                    played: playedMatches.length,
                    scheduled: matches.filter(m => m.status === 'scheduled').length,
                    postponed: matches.filter(m => m.status === 'postponed').length,
                    completionPercentage: ((playedMatches.length / matches.length) * 100).toFixed(1)
                },
                goals: {
                    total: totalGoals,
                    average: (totalGoals / playedMatches.length).toFixed(2),
                    highestInMatch: maxGoals,
                    highestScoringMatch: highestScoringMatch
                },
                results: {
                    homeWins: homeWins,
                    awayWins: awayWins,
                    draws: draws,
                    homeWinPercentage: ((homeWins / playedMatches.length) * 100).toFixed(1),
                    awayWinPercentage: ((awayWins / playedMatches.length) * 100).toFixed(1),
                    drawPercentage: ((draws / playedMatches.length) * 100).toFixed(1)
                },
                teams: teamStats,
                players: playerStats,
                records: this.calculateRecords(playedMatches, teams)
            };

        } catch (error) {
            console.error('Error getting tournament statistics:', error);
            return this.getEmptyStatistics();
        }
    }

    /**
     * Calculate team-based statistics
     */
    calculateTeamStatistics(teams, playedMatches) {
        try {
            const teamStats = {
                bestAttack: null,
                bestDefense: null,
                mostWins: null,
                mostDraws: null,
                mostLosses: null,
                bestHomeRecord: null,
                bestAwayRecord: null,
                longestWinningStreak: null,
                longestUnbeatenStreak: null
            };

            if (teams.length === 0) return teamStats;

            // Find best attack (most goals scored)
            teamStats.bestAttack = teams.reduce((best, team) => 
                team.statistics.goalsFor > best.statistics.goalsFor ? team : best
            );

            // Find best defense (least goals conceded)
            teamStats.bestDefense = teams.reduce((best, team) => 
                team.statistics.goalsAgainst < best.statistics.goalsAgainst ? team : best
            );

            // Find most wins
            teamStats.mostWins = teams.reduce((best, team) => 
                team.statistics.won > best.statistics.won ? team : best
            );

            // Find most draws
            teamStats.mostDraws = teams.reduce((best, team) => 
                team.statistics.drawn > best.statistics.drawn ? team : best
            );

            // Calculate home/away records
            const homeAwayRecords = this.calculateHomeAwayRecords(teams, playedMatches);
            teamStats.bestHomeRecord = homeAwayRecords.bestHome;
            teamStats.bestAwayRecord = homeAwayRecords.bestAway;

            // Calculate streaks
            const streaks = this.calculateTeamStreaks(teams, playedMatches);
            teamStats.longestWinningStreak = streaks.longestWinning;
            teamStats.longestUnbeatenStreak = streaks.longestUnbeaten;

            return teamStats;

        } catch (error) {
            console.error('Error calculating team statistics:', error);
            return {};
        }
    }

    /**
     * Calculate home/away records for all teams
     */
    calculateHomeAwayRecords(teams, playedMatches) {
        try {
            const records = teams.map(team => {
                const homeMatches = playedMatches.filter(m => m.homeTeam === team.id);
                const awayMatches = playedMatches.filter(m => m.awayTeam === team.id);

                const homeRecord = {
                    team: team,
                    played: homeMatches.length,
                    won: homeMatches.filter(m => m.homeGoals > m.awayGoals).length,
                    drawn: homeMatches.filter(m => m.homeGoals === m.awayGoals).length,
                    lost: homeMatches.filter(m => m.homeGoals < m.awayGoals).length,
                    points: 0
                };

                const awayRecord = {
                    team: team,
                    played: awayMatches.length,
                    won: awayMatches.filter(m => m.awayGoals > m.homeGoals).length,
                    drawn: awayMatches.filter(m => m.awayGoals === m.homeGoals).length,
                    lost: awayMatches.filter(m => m.awayGoals < m.homeGoals).length,
                    points: 0
                };

                homeRecord.points = homeRecord.won * 3 + homeRecord.drawn;
                awayRecord.points = awayRecord.won * 3 + awayRecord.drawn;

                return { home: homeRecord, away: awayRecord };
            });

            const bestHome = records.reduce((best, record) => 
                record.home.points > best.home.points ? record : best
            ).home;

            const bestAway = records.reduce((best, record) => 
                record.away.points > best.away.points ? record : best
            ).away;

            return { bestHome, bestAway };

        } catch (error) {
            console.error('Error calculating home/away records:', error);
            return { bestHome: null, bestAway: null };
        }
    }

    /**
     * Calculate team streaks
     */
    calculateTeamStreaks(teams, playedMatches) {
        try {
            let longestWinning = { team: null, streak: 0 };
            let longestUnbeaten = { team: null, streak: 0 };

            teams.forEach(team => {
                const teamMatches = playedMatches
                    .filter(m => m.homeTeam === team.id || m.awayTeam === team.id)
                    .sort((a, b) => b.day - a.day); // Most recent first

                let currentWinStreak = 0;
                let currentUnbeatenStreak = 0;
                let maxWinStreak = 0;
                let maxUnbeatenStreak = 0;

                teamMatches.forEach(match => {
                    const isHome = match.homeTeam === team.id;
                    const teamGoals = isHome ? match.homeGoals : match.awayGoals;
                    const opponentGoals = isHome ? match.awayGoals : match.homeGoals;

                    if (teamGoals > opponentGoals) {
                        currentWinStreak++;
                        currentUnbeatenStreak++;
                        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                        maxUnbeatenStreak = Math.max(maxUnbeatenStreak, currentUnbeatenStreak);
                    } else if (teamGoals === opponentGoals) {
                        currentWinStreak = 0;
                        currentUnbeatenStreak++;
                        maxUnbeatenStreak = Math.max(maxUnbeatenStreak, currentUnbeatenStreak);
                    } else {
                        currentWinStreak = 0;
                        currentUnbeatenStreak = 0;
                    }
                });

                if (maxWinStreak > longestWinning.streak) {
                    longestWinning = { team: team, streak: maxWinStreak };
                }

                if (maxUnbeatenStreak > longestUnbeaten.streak) {
                    longestUnbeaten = { team: team, streak: maxUnbeatenStreak };
                }
            });

            return { longestWinning, longestUnbeaten };

        } catch (error) {
            console.error('Error calculating team streaks:', error);
            return { longestWinning: null, longestUnbeaten: null };
        }
    }

    /**
     * Calculate player statistics (simulated based on available data)
     */
    calculatePlayerStatistics(playedMatches, teams) {
        try {
            // Since we don't have detailed player data, we'll simulate based on match results
            const playerStats = {
                topScorers: [],
                bestPlayers: [],
                totalPlayers: teams.reduce((sum, team) => sum + (team.squad?.length || 6), 0)
            };

            // Extract best players from matches
            const bestPlayerCounts = {};
            playedMatches.forEach(match => {
                if (match.bestPlayer) {
                    bestPlayerCounts[match.bestPlayer] = (bestPlayerCounts[match.bestPlayer] || 0) + 1;
                }
            });

            // Convert to array and sort
            playerStats.bestPlayers = Object.entries(bestPlayerCounts)
                .map(([name, count]) => ({ name, awards: count }))
                .sort((a, b) => b.awards - a.awards)
                .slice(0, 10);

            // Simulate top scorers based on team performance
            const simulatedScorers = this.simulateTopScorers(teams, playedMatches);
            playerStats.topScorers = simulatedScorers;

            return playerStats;

        } catch (error) {
            console.error('Error calculating player statistics:', error);
            return { topScorers: [], bestPlayers: [], totalPlayers: 0 };
        }
    }

    /**
     * Simulate top scorers based on team performance
     */
    simulateTopScorers(teams, playedMatches) {
        try {
            const scorers = [];

            teams.forEach(team => {
                if (team.squad && team.squad.length > 0) {
                    // Simulate goals for each player based on team's total goals
                    const teamGoals = team.statistics.goalsFor;
                    const attackers = team.squad.filter(p => p.position === 'مهاجم');
                    const midfielders = team.squad.filter(p => p.position === 'وسط');

                    // Distribute goals among attackers and midfielders
                    attackers.forEach((player, index) => {
                        const goals = Math.floor(teamGoals * (0.4 - index * 0.1)) || 0;
                        if (goals > 0) {
                            scorers.push({
                                name: player.name,
                                team: team.name,
                                teamId: team.id,
                                goals: goals,
                                position: player.position
                            });
                        }
                    });

                    midfielders.forEach((player, index) => {
                        const goals = Math.floor(teamGoals * (0.2 - index * 0.05)) || 0;
                        if (goals > 0) {
                            scorers.push({
                                name: player.name,
                                team: team.name,
                                teamId: team.id,
                                goals: goals,
                                position: player.position
                            });
                        }
                    });
                }
            });

            return scorers.sort((a, b) => b.goals - a.goals).slice(0, 15);

        } catch (error) {
            console.error('Error simulating top scorers:', error);
            return [];
        }
    }

    /**
     * Calculate tournament records
     */
    calculateRecords(playedMatches, teams) {
        try {
            const records = {
                biggestWin: null,
                mostGoalsInMatch: null,
                cleanSheetRecord: null,
                comebackWin: null
            };

            let maxWinMargin = 0;
            let maxGoalsInMatch = 0;
            let mostCleanSheets = 0;

            // Find biggest win and most goals in a match
            playedMatches.forEach(match => {
                const totalGoals = match.homeGoals + match.awayGoals;
                const margin = Math.abs(match.homeGoals - match.awayGoals);

                if (totalGoals > maxGoalsInMatch) {
                    maxGoalsInMatch = totalGoals;
                    records.mostGoalsInMatch = {
                        match: match,
                        goals: totalGoals
                    };
                }

                if (margin > maxWinMargin) {
                    maxWinMargin = margin;
                    records.biggestWin = {
                        match: match,
                        margin: margin,
                        winner: match.homeGoals > match.awayGoals ? match.homeTeamInfo.name : match.awayTeamInfo.name
                    };
                }
            });

            // Find team with most clean sheets
            teams.forEach(team => {
                const cleanSheets = this.calculateCleanSheets(team.id, playedMatches);
                if (cleanSheets > mostCleanSheets) {
                    mostCleanSheets = cleanSheets;
                    records.cleanSheetRecord = {
                        team: team,
                        cleanSheets: cleanSheets
                    };
                }
            });

            return records;

        } catch (error) {
            console.error('Error calculating records:', error);
            return {};
        }
    }

    /**
     * Calculate clean sheets for a team
     */
    calculateCleanSheets(teamId, playedMatches) {
        try {
            return playedMatches.filter(match => {
                if (match.homeTeam === teamId) {
                    return match.awayGoals === 0;
                } else if (match.awayTeam === teamId) {
                    return match.homeGoals === 0;
                }
                return false;
            }).length;
        } catch (error) {
            console.error('Error calculating clean sheets:', error);
            return 0;
        }
    }

    /**
     * Get team performance analytics
     */
    getTeamPerformanceAnalytics(teamId) {
        try {
            const team = this.teamsEngine.getTeam(teamId);
            if (!team) return null;

            const teamMatches = this.fixturesEngine.getFixturesByTeam(teamId);
            const playedMatches = teamMatches.filter(m => m.status === 'played' && 
                m.homeGoals !== null && m.awayGoals !== null);

            if (playedMatches.length === 0) {
                return {
                    team: team,
                    performance: {
                        efficiency: 0,
                        consistency: 0,
                        momentum: 0
                    },
                    trends: [],
                    predictions: null
                };
            }

            // Calculate performance metrics
            const efficiency = this.calculateEfficiency(team, playedMatches);
            const consistency = this.calculateConsistency(teamId, playedMatches);
            const momentum = this.calculateMomentum(teamId, playedMatches);

            // Get performance trends
            const trends = this.getPerformanceTrends(teamId, playedMatches);

            return {
                team: team,
                performance: {
                    efficiency: efficiency,
                    consistency: consistency,
                    momentum: momentum
                },
                trends: trends,
                predictions: this.generatePredictions(team, trends)
            };

        } catch (error) {
            console.error('Error getting team performance analytics:', error);
            return null;
        }
    }

    /**
     * Calculate team efficiency (points per match)
     */
    calculateEfficiency(team, playedMatches) {
        if (playedMatches.length === 0) return 0;
        return (team.statistics.points / playedMatches.length * 100 / 3).toFixed(1);
    }

    /**
     * Calculate team consistency (standard deviation of performance)
     */
    calculateConsistency(teamId, playedMatches) {
        try {
            if (playedMatches.length < 2) return 0;

            const performances = playedMatches.map(match => {
                const isHome = match.homeTeam === teamId;
                const teamGoals = isHome ? match.homeGoals : match.awayGoals;
                const opponentGoals = isHome ? match.awayGoals : match.homeGoals;
                
                if (teamGoals > opponentGoals) return 3;
                if (teamGoals === opponentGoals) return 1;
                return 0;
            });

            const mean = performances.reduce((sum, p) => sum + p, 0) / performances.length;
            const variance = performances.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / performances.length;
            const standardDeviation = Math.sqrt(variance);

            // Convert to consistency score (lower deviation = higher consistency)
            return Math.max(0, 100 - (standardDeviation * 50)).toFixed(1);

        } catch (error) {
            console.error('Error calculating consistency:', error);
            return 0;
        }
    }

    /**
     * Calculate team momentum (recent form weighted)
     */
    calculateMomentum(teamId, playedMatches) {
        try {
            if (playedMatches.length === 0) return 0;

            const recentMatches = playedMatches
                .sort((a, b) => b.day - a.day)
                .slice(0, 5);

            let momentum = 0;
            recentMatches.forEach((match, index) => {
                const weight = (5 - index) / 5; // More recent matches have higher weight
                const isHome = match.homeTeam === teamId;
                const teamGoals = isHome ? match.homeGoals : match.awayGoals;
                const opponentGoals = isHome ? match.awayGoals : match.homeGoals;
                
                let points = 0;
                if (teamGoals > opponentGoals) points = 3;
                else if (teamGoals === opponentGoals) points = 1;
                
                momentum += points * weight;
            });

            return ((momentum / 3) * 100).toFixed(1);

        } catch (error) {
            console.error('Error calculating momentum:', error);
            return 0;
        }
    }

    /**
     * Get performance trends over time
     */
    getPerformanceTrends(teamId, playedMatches) {
        try {
            const sortedMatches = playedMatches.sort((a, b) => a.day - b.day);
            const trends = [];

            sortedMatches.forEach(match => {
                const isHome = match.homeTeam === teamId;
                const teamGoals = isHome ? match.homeGoals : match.awayGoals;
                const opponentGoals = isHome ? match.awayGoals : match.homeGoals;
                
                let points = 0;
                if (teamGoals > opponentGoals) points = 3;
                else if (teamGoals === opponentGoals) points = 1;

                trends.push({
                    day: match.day,
                    points: points,
                    goals: teamGoals,
                    conceded: opponentGoals,
                    opponent: isHome ? match.awayTeamInfo.name : match.homeTeamInfo.name
                });
            });

            return trends;

        } catch (error) {
            console.error('Error getting performance trends:', error);
            return [];
        }
    }

    /**
     * Generate simple predictions based on trends
     */
    generatePredictions(team, trends) {
        try {
            if (trends.length < 3) return null;

            const recentTrends = trends.slice(-3);
            const avgPoints = recentTrends.reduce((sum, t) => sum + t.points, 0) / recentTrends.length;
            const avgGoals = recentTrends.reduce((sum, t) => sum + t.goals, 0) / recentTrends.length;

            let outlook = 'مستقر';
            if (avgPoints > 2) outlook = 'إيجابي';
            else if (avgPoints < 1) outlook = 'سلبي';

            return {
                outlook: outlook,
                expectedPoints: avgPoints.toFixed(1),
                expectedGoals: avgGoals.toFixed(1),
                confidence: Math.min(100, trends.length * 20)
            };

        } catch (error) {
            console.error('Error generating predictions:', error);
            return null;
        }
    }

    /**
     * Get empty statistics structure
     */
    getEmptyStatistics() {
        return {
            matches: {
                total: 0,
                played: 0,
                scheduled: 0,
                postponed: 0,
                completionPercentage: '0.0'
            },
            goals: {
                total: 0,
                average: '0.0',
                highestInMatch: 0,
                highestScoringMatch: null
            },
            results: {
                homeWins: 0,
                awayWins: 0,
                draws: 0,
                homeWinPercentage: '0.0',
                awayWinPercentage: '0.0',
                drawPercentage: '0.0'
            },
            teams: {},
            players: {
                topScorers: [],
                bestPlayers: [],
                totalPlayers: 0
            },
            records: {}
        };
    }

    /**
     * Export statistics data
     */
    exportStatistics(format = 'json') {
        try {
            const stats = this.getTournamentStatistics();
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(stats, null, 2);
                
                case 'csv':
                    return this.exportStatsToCSV(stats);
                
                default:
                    throw new Error('Unsupported export format');
            }
        } catch (error) {
            console.error('Error exporting statistics:', error);
            return null;
        }
    }

    /**
     * Export statistics to CSV format
     */
    exportStatsToCSV(stats) {
        try {
            let csv = 'نوع الإحصائية,القيمة\n';
            
            csv += `إجمالي المباريات,${stats.matches.total}\n`;
            csv += `المباريات المنتهية,${stats.matches.played}\n`;
            csv += `إجمالي الأهداف,${stats.goals.total}\n`;
            csv += `متوسط الأهداف,${stats.goals.average}\n`;
            csv += `الانتصارات على أرض الملعب,${stats.results.homeWins}\n`;
            csv += `الانتصارات خارج الأرض,${stats.results.awayWins}\n`;
            csv += `التعادلات,${stats.results.draws}\n`;

            if (stats.players.topScorers.length > 0) {
                csv += '\nأفضل الهدافين\n';
                csv += 'اللاعب,الفريق,الأهداف\n';
                stats.players.topScorers.forEach(scorer => {
                    csv += `${scorer.name},${scorer.team},${scorer.goals}\n`;
                });
            }

            return csv;

        } catch (error) {
            console.error('Error exporting stats to CSV:', error);
            return '';
        }
    }
}

export default StatisticsEngine;