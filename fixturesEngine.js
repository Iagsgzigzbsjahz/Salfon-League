/**
 * Fixtures Engine for Salfoon Ramadan League Platform
 * Handles match schedule display, filtering, and organization
 */

import LocalStorageManager from './storage.js';

class FixturesEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.ramadanDays = {
            3: 'الثالث من رمضان',
            4: 'الرابع من رمضان',
            5: 'الخامس من رمضان',
            6: 'السادس من رمضان',
            7: 'السابع من رمضان',
            8: 'الثامن من رمضان',
            9: 'التاسع من رمضان',
            10: 'العاشر من رمضان',
            11: 'الحادي عشر من رمضان',
            12: 'الثاني عشر من رمضان',
            13: 'الثالث عشر من رمضان',
            14: 'الرابع عشر من رمضان',
            15: 'الخامس عشر من رمضان',
            16: 'السادس عشر من رمضان',
            17: 'السابع عشر من رمضان',
            18: 'الثامن عشر من رمضان',
            19: 'التاسع عشر من رمضان',
            20: 'العشرون من رمضان',
            21: 'الحادي والعشرون من رمضان',
            22: 'الثاني والعشرون من رمضان',
            23: 'الثالث والعشرون من رمضان'
        };
    }

    /**
     * Get all fixtures with team information
     */
    getAllFixtures() {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            const teamsData = this.storage.load(this.storage.keys.TEAMS);

            if (!matchesData || !teamsData) {
                throw new Error('Failed to load required data');
            }

            // Create team lookup map
            const teamMap = {};
            teamsData.teams.forEach(team => {
                teamMap[team.id] = team;
            });

            // Enhance matches with team information
            const fixtures = matchesData.matches.map(match => ({
                ...match,
                homeTeamInfo: teamMap[match.homeTeam],
                awayTeamInfo: teamMap[match.awayTeam],
                dayName: this.ramadanDays[match.day],
                formattedTime: this.formatTime(match.scheduledTime),
                statusText: this.getStatusText(match.status),
                resultText: this.getResultText(match)
            }));

            return this.sortBySchedule(fixtures);

        } catch (error) {
            console.error('Error getting all fixtures:', error);
            return [];
        }
    }

    /**
     * Get fixtures by date range
     */
    getFixturesByDateRange(startDay, endDay) {
        try {
            const allFixtures = this.getAllFixtures();
            return allFixtures.filter(fixture => 
                fixture.day >= startDay && fixture.day <= endDay
            );
        } catch (error) {
            console.error('Error getting fixtures by date range:', error);
            return [];
        }
    }

    /**
     * Get fixtures by status
     */
    getFixturesByStatus(status) {
        try {
            const allFixtures = this.getAllFixtures();
            return allFixtures.filter(fixture => fixture.status === status);
        } catch (error) {
            console.error('Error getting fixtures by status:', error);
            return [];
        }
    }

    /**
     * Get fixtures by team
     */
    getFixturesByTeam(teamId) {
        try {
            const allFixtures = this.getAllFixtures();
            return allFixtures.filter(fixture => 
                fixture.homeTeam === teamId || fixture.awayTeam === teamId
            );
        } catch (error) {
            console.error('Error getting fixtures by team:', error);
            return [];
        }
    }

    /**
     * Get next scheduled match
     */
    getNextMatch() {
        try {
            const scheduledMatches = this.getFixturesByStatus('scheduled');
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
            const playedMatches = this.getFixturesByStatus('played');
            // Sort by day descending to get the most recent
            const sortedMatches = playedMatches.sort((a, b) => b.day - a.day);
            return sortedMatches.length > 0 ? sortedMatches[0] : null;
        } catch (error) {
            console.error('Error getting last match:', error);
            return null;
        }
    }

    /**
     * Get upcoming matches (next 3 scheduled matches)
     */
    getUpcomingMatches(count = 3) {
        try {
            const scheduledMatches = this.getFixturesByStatus('scheduled');
            return scheduledMatches.slice(0, count);
        } catch (error) {
            console.error('Error getting upcoming matches:', error);
            return [];
        }
    }

    /**
     * Get recent results (last 3 played matches)
     */
    getRecentResults(count = 3) {
        try {
            const playedMatches = this.getFixturesByStatus('played');
            const sortedMatches = playedMatches.sort((a, b) => b.day - a.day);
            return sortedMatches.slice(0, count);
        } catch (error) {
            console.error('Error getting recent results:', error);
            return [];
        }
    }

    /**
     * Get postponed matches
     */
    getPostponedMatches() {
        try {
            return this.getFixturesByStatus('postponed');
        } catch (error) {
            console.error('Error getting postponed matches:', error);
            return [];
        }
    }

    /**
     * Get fixtures grouped by day
     */
    getFixturesGroupedByDay() {
        try {
            const allFixtures = this.getAllFixtures();
            const groupedFixtures = {};

            allFixtures.forEach(fixture => {
                const day = fixture.day;
                if (!groupedFixtures[day]) {
                    groupedFixtures[day] = {
                        day: day,
                        dayName: this.ramadanDays[day],
                        matches: []
                    };
                }
                groupedFixtures[day].matches.push(fixture);
            });

            // Convert to array and sort by day
            return Object.values(groupedFixtures).sort((a, b) => a.day - b.day);

        } catch (error) {
            console.error('Error grouping fixtures by day:', error);
            return [];
        }
    }

    /**
     * Get fixtures grouped by week
     */
    getFixturesGroupedByWeek() {
        try {
            const allFixtures = this.getAllFixtures();
            const weeks = [
                { name: 'الأسبوع الأول', start: 3, end: 9 },
                { name: 'الأسبوع الثاني', start: 10, end: 16 },
                { name: 'الأسبوع الثالث', start: 17, end: 23 }
            ];

            return weeks.map(week => ({
                ...week,
                matches: allFixtures.filter(fixture => 
                    fixture.day >= week.start && fixture.day <= week.end
                )
            }));

        } catch (error) {
            console.error('Error grouping fixtures by week:', error);
            return [];
        }
    }

    /**
     * Sort fixtures by schedule (day, then time)
     */
    sortBySchedule(fixtures) {
        return [...fixtures].sort((a, b) => {
            if (a.day !== b.day) {
                return a.day - b.day;
            }
            return a.scheduledTime.localeCompare(b.scheduledTime);
        });
    }

    /**
     * Filter fixtures by multiple criteria
     */
    filterFixtures(criteria) {
        try {
            let fixtures = this.getAllFixtures();

            if (criteria.team) {
                fixtures = fixtures.filter(fixture => 
                    fixture.homeTeam === criteria.team || fixture.awayTeam === criteria.team
                );
            }

            if (criteria.status) {
                fixtures = fixtures.filter(fixture => fixture.status === criteria.status);
            }

            if (criteria.startDay) {
                fixtures = fixtures.filter(fixture => fixture.day >= criteria.startDay);
            }

            if (criteria.endDay) {
                fixtures = fixtures.filter(fixture => fixture.day <= criteria.endDay);
            }

            if (criteria.hasResult !== undefined) {
                fixtures = fixtures.filter(fixture => {
                    const hasResult = fixture.homeGoals !== null && fixture.awayGoals !== null;
                    return hasResult === criteria.hasResult;
                });
            }

            return fixtures;

        } catch (error) {
            console.error('Error filtering fixtures:', error);
            return [];
        }
    }

    /**
     * Search fixtures by team name
     */
    searchFixtures(searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getAllFixtures();
            }

            const allFixtures = this.getAllFixtures();
            const term = searchTerm.toLowerCase().trim();

            return allFixtures.filter(fixture => 
                fixture.homeTeamInfo.name.toLowerCase().includes(term) ||
                fixture.awayTeamInfo.name.toLowerCase().includes(term) ||
                fixture.homeTeamInfo.shortName.toLowerCase().includes(term) ||
                fixture.awayTeamInfo.shortName.toLowerCase().includes(term)
            );

        } catch (error) {
            console.error('Error searching fixtures:', error);
            return [];
        }
    }

    /**
     * Get match statistics
     */
    getMatchStatistics() {
        try {
            const allFixtures = this.getAllFixtures();
            
            const stats = {
                total: allFixtures.length,
                played: 0,
                scheduled: 0,
                postponed: 0,
                totalGoals: 0,
                homeWins: 0,
                awayWins: 0,
                draws: 0,
                averageGoals: 0,
                highestScoringMatch: null,
                biggestWin: null
            };

            let maxGoals = 0;
            let maxWinMargin = 0;

            allFixtures.forEach(fixture => {
                switch (fixture.status) {
                    case 'played':
                        stats.played++;
                        if (fixture.homeGoals !== null && fixture.awayGoals !== null) {
                            const totalGoals = fixture.homeGoals + fixture.awayGoals;
                            stats.totalGoals += totalGoals;

                            // Check for highest scoring match
                            if (totalGoals > maxGoals) {
                                maxGoals = totalGoals;
                                stats.highestScoringMatch = fixture;
                            }

                            // Check for biggest win
                            const margin = Math.abs(fixture.homeGoals - fixture.awayGoals);
                            if (margin > maxWinMargin) {
                                maxWinMargin = margin;
                                stats.biggestWin = fixture;
                            }

                            // Count results
                            if (fixture.homeGoals > fixture.awayGoals) {
                                stats.homeWins++;
                            } else if (fixture.awayGoals > fixture.homeGoals) {
                                stats.awayWins++;
                            } else {
                                stats.draws++;
                            }
                        }
                        break;
                    case 'scheduled':
                        stats.scheduled++;
                        break;
                    case 'postponed':
                        stats.postponed++;
                        break;
                }
            });

            stats.averageGoals = stats.played > 0 ? (stats.totalGoals / stats.played).toFixed(2) : 0;

            return stats;

        } catch (error) {
            console.error('Error getting match statistics:', error);
            return null;
        }
    }

    /**
     * Get team's next fixture
     */
    getTeamNextFixture(teamId) {
        try {
            const teamFixtures = this.getFixturesByTeam(teamId);
            const scheduledFixtures = teamFixtures.filter(fixture => fixture.status === 'scheduled');
            return scheduledFixtures.length > 0 ? scheduledFixtures[0] : null;
        } catch (error) {
            console.error('Error getting team next fixture:', error);
            return null;
        }
    }

    /**
     * Get team's last result
     */
    getTeamLastResult(teamId) {
        try {
            const teamFixtures = this.getFixturesByTeam(teamId);
            const playedFixtures = teamFixtures.filter(fixture => fixture.status === 'played');
            const sortedFixtures = playedFixtures.sort((a, b) => b.day - a.day);
            return sortedFixtures.length > 0 ? sortedFixtures[0] : null;
        } catch (error) {
            console.error('Error getting team last result:', error);
            return null;
        }
    }

    /**
     * Format time for display
     */
    formatTime(time) {
        if (!time) return '21:00';
        
        try {
            const [hours, minutes] = time.split(':');
            return `${hours}:${minutes}`;
        } catch (error) {
            return time;
        }
    }

    /**
     * Get status text in Arabic
     */
    getStatusText(status) {
        const statusMap = {
            'scheduled': 'مجدولة',
            'played': 'انتهت',
            'postponed': 'مؤجلة'
        };
        return statusMap[status] || status;
    }

    /**
     * Get result text for display
     */
    getResultText(match) {
        if (match.status === 'played' && match.homeGoals !== null && match.awayGoals !== null) {
            return `${match.homeGoals} - ${match.awayGoals}`;
        } else if (match.status === 'postponed') {
            return 'مؤجلة';
        } else {
            return this.formatTime(match.scheduledTime);
        }
    }

    /**
     * Get match result class for styling
     */
    getMatchResultClass(match, teamId = null) {
        if (match.status !== 'played' || match.homeGoals === null || match.awayGoals === null) {
            return match.status;
        }

        if (!teamId) {
            // General match result
            if (match.homeGoals > match.awayGoals) {
                return 'home-win';
            } else if (match.awayGoals > match.homeGoals) {
                return 'away-win';
            } else {
                return 'draw';
            }
        } else {
            // Result from team's perspective
            const isHome = match.homeTeam === teamId;
            const teamGoals = isHome ? match.homeGoals : match.awayGoals;
            const opponentGoals = isHome ? match.awayGoals : match.homeGoals;

            if (teamGoals > opponentGoals) {
                return 'win';
            } else if (opponentGoals > teamGoals) {
                return 'loss';
            } else {
                return 'draw';
            }
        }
    }

    /**
     * Check if match is today (based on current Ramadan day)
     */
    isMatchToday(match) {
        // This would require knowing the current Ramadan day
        // For now, return false as we don't have real-time date mapping
        return false;
    }

    /**
     * Get countdown to next match
     */
    getCountdownToNextMatch() {
        const nextMatch = this.getNextMatch();
        if (!nextMatch) {
            return null;
        }

        // This would require real date/time calculation
        // For now, return match information
        return {
            match: nextMatch,
            timeRemaining: 'قريباً',
            isToday: this.isMatchToday(nextMatch)
        };
    }

    /**
     * Export fixtures to different formats
     */
    exportFixtures(format = 'json') {
        try {
            const fixtures = this.getAllFixtures();
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(fixtures, null, 2);
                
                case 'csv':
                    return this.exportToCSV(fixtures);
                
                case 'text':
                    return this.exportToText(fixtures);
                
                default:
                    throw new Error('Unsupported export format');
            }
        } catch (error) {
            console.error('Error exporting fixtures:', error);
            return null;
        }
    }

    /**
     * Export fixtures to CSV format
     */
    exportToCSV(fixtures) {
        const headers = ['اليوم', 'الفريق المضيف', 'الفريق الضيف', 'الوقت', 'النتيجة', 'الحالة'];
        const rows = fixtures.map(fixture => [
            fixture.dayName,
            fixture.homeTeamInfo.name,
            fixture.awayTeamInfo.name,
            fixture.formattedTime,
            fixture.resultText,
            fixture.statusText
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Export fixtures to text format
     */
    exportToText(fixtures) {
        return fixtures.map(fixture => 
            `${fixture.dayName}: ${fixture.homeTeamInfo.name} × ${fixture.awayTeamInfo.name} - ${fixture.resultText}`
        ).join('\n');
    }
}

export default FixturesEngine;