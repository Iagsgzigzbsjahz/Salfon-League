/**
 * Statistics Page Controller for Salfoon Ramadan League Platform
 * Handles statistics display, analytics, and data visualization
 */

import LocalStorageManager from './storage.js';
import StatisticsEngine from './statisticsEngine.js';
import TeamsEngine from './teamsEngine.js';

class StatisticsController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.statisticsEngine = new StatisticsEngine();
        this.teamsEngine = new TeamsEngine();
        this.currentCategory = 'players';
        this.tournamentStats = null;
        
        this.init();
    }

    async init() {
        try {
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load statistics data
            this.loadStatistics();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing statistics controller:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    loadStatistics() {
        try {
            // Get tournament statistics
            this.tournamentStats = this.statisticsEngine.getTournamentStatistics();
            
            // Display overview
            this.displayTournamentOverview();
            
            // Display current category
            this.displayCategory(this.currentCategory);
            
            // Populate team selector
            this.populateTeamSelector();
            
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('حدث خطأ في تحميل الإحصائيات');
        }
    }

    displayTournamentOverview() {
        if (!this.tournamentStats) return;

        const { matches, goals, results } = this.tournamentStats;

        // Update overview cards
        document.getElementById('total-matches').textContent = matches.total;
        document.getElementById('completion-percentage').textContent = `${matches.completionPercentage}% مكتملة`;
        document.getElementById('total-goals').textContent = goals.total;
        document.getElementById('average-goals').textContent = `${goals.average} متوسط/مباراة`;
        document.getElementById('home-wins').textContent = results.homeWins;
        document.getElementById('home-win-percentage').textContent = `${results.homeWinPercentage}%`;
        document.getElementById('away-wins').textContent = results.awayWins;
        document.getElementById('away-win-percentage').textContent = `${results.awayWinPercentage}%`;
    }

    displayCategory(category) {
        // Hide all content sections
        document.querySelectorAll('.stats-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected category
        document.getElementById(`${category}-stats`).classList.add('active');

        // Load category-specific data
        switch (category) {
            case 'players':
                this.displayPlayersStats();
                break;
            case 'teams':
                this.displayTeamsStats();
                break;
            case 'matches':
                this.displayMatchesStats();
                break;
            case 'records':
                this.displayRecords();
                break;
        }
    }

    displayPlayersStats() {
        if (!this.tournamentStats) return;

        const { players } = this.tournamentStats;

        // Display top scorers
        this.displayTopScorers(players.topScorers);
        
        // Display best players
        this.displayBestPlayers(players.bestPlayers);
        
        // Update player statistics
        document.getElementById('total-players').textContent = players.totalPlayers;
        
        const avgGoalsPerPlayer = players.totalPlayers > 0 && this.tournamentStats.goals.total > 0 ? 
            (this.tournamentStats.goals.total / players.totalPlayers).toFixed(2) : '0.0';
        document.getElementById('avg-goals-per-player').textContent = avgGoalsPerPlayer;
    }

    displayTopScorers(scorers) {
        const container = document.getElementById('top-scorers');
        if (!container) return;

        if (scorers.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد إحصائيات هدافين بعد</p>';
            return;
        }

        container.innerHTML = `
            <div class="scorers-header">
                <span class="rank-header">المركز</span>
                <span class="player-header">اللاعب</span>
                <span class="team-header">الفريق</span>
                <span class="goals-header">الأهداف</span>
            </div>
            ${scorers.map((scorer, index) => `
                <div class="scorer-row">
                    <span class="scorer-rank">${index + 1}</span>
                    <span class="scorer-name">${scorer.name}</span>
                    <span class="scorer-team">${scorer.team}</span>
                    <span class="scorer-goals">${scorer.goals}</span>
                </div>
            `).join('')}
        `;
    }

    displayBestPlayers(bestPlayers) {
        const container = document.getElementById('best-players');
        if (!container) return;

        if (bestPlayers.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد جوائز أفضل لاعب بعد</p>';
            return;
        }

        container.innerHTML = bestPlayers.map((player, index) => `
            <div class="best-player-item">
                <div class="player-rank">${index + 1}</div>
                <div class="player-info">
                    <h4 class="player-name">${player.name}</h4>
                    <p class="player-awards">${player.awards} جائزة أفضل لاعب</p>
                </div>
            </div>
        `).join('');
    }

    displayTeamsStats() {
        if (!this.tournamentStats) return;

        const { teams } = this.tournamentStats;

        // Display best attack
        this.displayTeamStat('best-attack', teams.bestAttack, 'أهداف', 'goalsFor');
        
        // Display best defense
        this.displayTeamStat('best-defense', teams.bestDefense, 'أهداف مستقبلة', 'goalsAgainst');
        
        // Display most wins
        this.displayTeamStat('most-wins', teams.mostWins, 'انتصار', 'won');
        
        // Display best home record
        this.displayTeamRecord('best-home', teams.bestHomeRecord, 'على أرض الملعب');
        
        // Display best away record
        this.displayTeamRecord('best-away', teams.bestAwayRecord, 'خارج الأرض');
    }

    displayTeamStat(containerId, team, statLabel, statProperty) {
        const container = document.getElementById(containerId);
        if (!container || !team) {
            if (container) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
            }
            return;
        }

        const statValue = team.statistics ? team.statistics[statProperty] : team[statProperty] || 0;

        container.innerHTML = `
            <div class="team-stat-display">
                <img src="${team.logo}" alt="${team.name}" class="team-stat-logo" 
                     onerror="this.src='images/default-team.png'">
                <div class="team-stat-info">
                    <h4 class="team-stat-name">${team.name}</h4>
                    <p class="team-stat-value">${statValue} ${statLabel}</p>
                </div>
            </div>
        `;
    }

    displayTeamRecord(containerId, record, location) {
        const container = document.getElementById(containerId);
        if (!container || !record) {
            if (container) {
                container.innerHTML = '<p class="no-data">لا توجد بيانات</p>';
            }
            return;
        }

        container.innerHTML = `
            <div class="team-stat-display">
                <img src="${record.team.logo}" alt="${record.team.name}" class="team-stat-logo" 
                     onerror="this.src='images/default-team.png'">
                <div class="team-stat-info">
                    <h4 class="team-stat-name">${record.team.name}</h4>
                    <p class="team-stat-value">${record.points} نقطة ${location}</p>
                    <p class="team-stat-detail">${record.won} فوز، ${record.drawn} تعادل، ${record.lost} خسارة</p>
                </div>
            </div>
        `;
    }

    displayMatchesStats() {
        if (!this.tournamentStats) return;

        const { results, goals } = this.tournamentStats;

        // Update results distribution
        this.updateResultsDistribution(results);
        
        // Display highest scoring match
        this.displayHighestScoringMatch(goals.highestScoringMatch);
        
        // Update goals statistics
        document.getElementById('highest-goals-match').textContent = goals.highestInMatch;
        document.getElementById('avg-goals-match').textContent = goals.average;
    }

    updateResultsDistribution(results) {
        const totalMatches = results.homeWins + results.awayWins + results.draws;
        
        if (totalMatches === 0) return;

        // Update counts
        document.getElementById('home-wins-count').textContent = results.homeWins;
        document.getElementById('away-wins-count').textContent = results.awayWins;
        document.getElementById('draws-count').textContent = results.draws;

        // Update bars
        const homeWinsBar = document.getElementById('home-wins-bar');
        const awayWinsBar = document.getElementById('away-wins-bar');
        const drawsBar = document.getElementById('draws-bar');

        if (homeWinsBar) {
            homeWinsBar.style.width = `${(results.homeWins / totalMatches) * 100}%`;
        }
        if (awayWinsBar) {
            awayWinsBar.style.width = `${(results.awayWins / totalMatches) * 100}%`;
        }
        if (drawsBar) {
            drawsBar.style.width = `${(results.draws / totalMatches) * 100}%`;
        }
    }

    displayHighestScoringMatch(match) {
        const container = document.getElementById('highest-scoring-match');
        if (!container) return;

        if (!match) {
            container.innerHTML = '<p class="no-data">لا توجد مباريات منتهية بعد</p>';
            return;
        }

        container.innerHTML = `
            <div class="match-highlight-content">
                <div class="match-teams">
                    <span class="home-team">${match.homeTeamInfo.name}</span>
                    <span class="match-score">${match.homeGoals} - ${match.awayGoals}</span>
                    <span class="away-team">${match.awayTeamInfo.name}</span>
                </div>
                <div class="match-details">
                    <span class="match-day">${match.dayName}</span>
                    <span class="total-goals">${match.homeGoals + match.awayGoals} أهداف</span>
                </div>
            </div>
        `;
    }

    displayRecords() {
        if (!this.tournamentStats) return;

        const { records, teams } = this.tournamentStats;

        // Display biggest win
        this.displayRecord('biggest-win-record', records.biggestWin, (record) => 
            `${record.winner} بفارق ${record.margin} أهداف`
        );

        // Display most goals in match
        this.displayRecord('most-goals-record', records.mostGoalsInMatch, (record) => 
            `${record.goals} أهداف في مباراة واحدة`
        );

        // Display clean sheet record
        this.displayRecord('clean-sheet-record', records.cleanSheetRecord, (record) => 
            `${record.team.name} - ${record.cleanSheets} مباراة`
        );

        // Display winning streak
        this.displayRecord('winning-streak-record', teams.longestWinningStreak, (record) => 
            `${record.team.name} - ${record.streak} مباريات`
        );

        // Display unbeaten streak
        this.displayRecord('unbeaten-streak-record', teams.longestUnbeatenStreak, (record) => 
            `${record.team.name} - ${record.streak} مباريات`
        );
    }

    displayRecord(containerId, record, formatter) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const detailElement = container.querySelector('.record-detail');
        if (!detailElement) return;

        if (!record) {
            detailElement.textContent = 'لا توجد بيانات';
            return;
        }

        detailElement.textContent = formatter(record);
    }

    populateTeamSelector() {
        const teams = this.teamsEngine.getAllTeams();
        const selector = document.getElementById('team-select');
        
        if (!selector) return;

        selector.innerHTML = '<option value="">اختر فريق</option>' + 
            teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
    }

    analyzeTeamPerformance() {
        const teamId = document.getElementById('team-select').value;
        
        if (!teamId) {
            this.showError('يرجى اختيار فريق للتحليل');
            return;
        }

        const analytics = this.statisticsEngine.getTeamPerformanceAnalytics(teamId);
        
        if (!analytics) {
            this.showError('حدث خطأ في تحليل الفريق');
            return;
        }

        this.displayTeamAnalytics(analytics);
    }

    displayTeamAnalytics(analytics) {
        const container = document.getElementById('analytics-result');
        if (!container) return;

        const { team, performance, trends, predictions } = analytics;

        container.innerHTML = `
            <div class="analytics-content">
                <div class="analytics-header">
                    <img src="${team.logo}" alt="${team.name}" class="analytics-logo" 
                         onerror="this.src='images/default-team.png'">
                    <h3>${team.name}</h3>
                </div>
                
                <div class="performance-metrics">
                    <h4>مؤشرات الأداء</h4>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <span class="metric-label">الكفاءة</span>
                            <span class="metric-value">${performance.efficiency}%</span>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${performance.efficiency}%"></div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">الثبات</span>
                            <span class="metric-value">${performance.consistency}%</span>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${performance.consistency}%"></div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">الزخم</span>
                            <span class="metric-value">${performance.momentum}%</span>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${performance.momentum}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${trends.length > 0 ? `
                    <div class="performance-trends">
                        <h4>اتجاه الأداء</h4>
                        <div class="trends-chart">
                            ${trends.map((trend, index) => `
                                <div class="trend-point" style="left: ${(index / (trends.length - 1)) * 100}%; bottom: ${(trend.points / 3) * 100}%">
                                    <span class="trend-tooltip">اليوم ${trend.day}: ${trend.points} نقاط</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${predictions ? `
                    <div class="predictions">
                        <h4>التوقعات</h4>
                        <div class="prediction-item">
                            <span class="prediction-label">التوقع العام:</span>
                            <span class="prediction-value ${predictions.outlook.toLowerCase()}">${predictions.outlook}</span>
                        </div>
                        <div class="prediction-item">
                            <span class="prediction-label">النقاط المتوقعة:</span>
                            <span class="prediction-value">${predictions.expectedPoints}</span>
                        </div>
                        <div class="prediction-item">
                            <span class="prediction-label">الأهداف المتوقعة:</span>
                            <span class="prediction-value">${predictions.expectedGoals}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        container.style.display = 'block';
    }

    exportStatistics(format) {
        try {
            const data = this.statisticsEngine.exportStatistics(format);
            
            if (!data) {
                this.showError('حدث خطأ في تصدير البيانات');
                return;
            }

            const blob = new Blob([data], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `salfoon_statistics.${format}`;
            link.click();
            
            this.showSuccess(`تم تصدير الإحصائيات بصيغة ${format.toUpperCase()}`);
            
        } catch (error) {
            console.error('Error exporting statistics:', error);
            this.showError('حدث خطأ في تصدير البيانات');
        }
    }

    setupEventListeners() {
        // Category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchCategory(tab.dataset.category);
            });
        });

        // Team analysis
        document.getElementById('analyze-btn')?.addEventListener('click', () => {
            this.analyzeTeamPerformance();
        });

        // Export buttons
        document.getElementById('export-json')?.addEventListener('click', () => {
            this.exportStatistics('json');
        });

        document.getElementById('export-csv')?.addEventListener('click', () => {
            this.exportStatistics('csv');
        });

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Mobile navigation
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Back to top
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTop.classList.add('show');
                } else {
                    backToTop.classList.remove('show');
                }
            });
        }
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // Update tab states
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Display category content
        this.displayCategory(category);
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
        }

        // Save theme preference
        const preferences = this.storage.load(this.storage.keys.USER_PREFERENCES) || {};
        preferences.darkMode = document.body.classList.contains('dark-theme');
        this.storage.save(this.storage.keys.USER_PREFERENCES, preferences);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.statisticsController = new StatisticsController();
});