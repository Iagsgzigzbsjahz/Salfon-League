/**
 * Standings Page Controller for Salfoon Ramadan League Platform
 * Handles standings display, real-time updates, and user interactions
 */

import LocalStorageManager from './storage.js';
import StandingsCalculator from './standingsEngine.js';
import TournamentSystem from './tournamentEngine.js';

class StandingsController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.standingsCalculator = new StandingsCalculator();
        this.tournament = new TournamentSystem();
        this.updateInterval = null;
        
        this.init();
    }

    async init() {
        try {
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load and display standings
            this.loadStandings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing standings controller:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    loadStandings() {
        try {
            // Get current standings
            const standings = this.standingsCalculator.calculateStandings();
            
            // Get league statistics
            const leagueStats = this.standingsCalculator.getLeagueStats();
            
            // Display standings table
            this.displayStandingsTable(standings);
            
            // Display tournament progress
            this.displayTournamentProgress(leagueStats);
            
            // Display league statistics
            this.displayLeagueStats(leagueStats);
            
            // Display playoff preview if applicable
            this.displayPlayoffPreview(standings);
            
            // Update last updated time
            this.updateLastUpdatedTime();
            
        } catch (error) {
            console.error('Error loading standings:', error);
            this.showError('حدث خطأ في تحميل الترتيب');
        }
    }

    displayStandingsTable(standings) {
        const tbody = document.getElementById('standings-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        standings.forEach((team, index) => {
            const row = document.createElement('tr');
            row.className = team.qualified ? 'qualified' : 'eliminated';
            
            // Add position change indicator if available
            const positionClass = this.getPositionChangeClass(team.position);
            
            row.innerHTML = `
                <td class="position ${positionClass}">
                    <span class="position-number">${team.position}</span>
                    ${team.qualified ? '<span class="qualification-indicator">✓</span>' : ''}
                </td>
                <td class="team-info">
                    <div class="team-display">
                        <img src="${team.logo}" alt="${team.teamName}" class="team-logo" 
                             onerror="this.src='images/default-team.png'">
                        <div class="team-details">
                            <span class="team-name">${team.teamName}</span>
                            <span class="qualification-status">${team.qualificationStatus}</span>
                        </div>
                    </div>
                </td>
                <td class="matches">${team.played}</td>
                <td class="wins">${team.won}</td>
                <td class="draws">${team.drawn}</td>
                <td class="losses">${team.lost}</td>
                <td class="goals-for">${team.goalsFor}</td>
                <td class="goals-against">${team.goalsAgainst}</td>
                <td class="goal-difference ${this.getGoalDifferenceClass(team.goalDifference)}">
                    ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}
                </td>
                <td class="points">
                    <strong>${team.points}</strong>
                </td>
                <td class="form">
                    ${this.renderForm(team.form)}
                </td>
            `;

            // Add click event for team details
            row.addEventListener('click', () => {
                this.showTeamDetails(team);
            });

            tbody.appendChild(row);
        });
    }

    renderForm(form) {
        if (!form || form.length === 0) {
            return '<span class="no-form">-</span>';
        }

        return form.map(result => {
            const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
            const displayText = result === 'W' ? 'ف' : result === 'D' ? 'ت' : 'خ';
            return `<span class="form-result ${className}">${displayText}</span>`;
        }).join('');
    }

    getGoalDifferenceClass(goalDifference) {
        if (goalDifference > 0) return 'positive';
        if (goalDifference < 0) return 'negative';
        return 'neutral';
    }

    getPositionChangeClass(position) {
        // This would require historical data to show position changes
        // For now, return empty string
        return '';
    }

    displayTournamentProgress(leagueStats) {
        if (!leagueStats) return;

        // Update progress statistics
        document.getElementById('played-matches').textContent = leagueStats.playedMatches;
        document.getElementById('remaining-matches').textContent = leagueStats.remainingMatches;
        document.getElementById('total-goals').textContent = leagueStats.totalGoals;
        document.getElementById('average-goals').textContent = leagueStats.averageGoalsPerMatch;

        // Update progress bar
        const progressPercentage = (leagueStats.playedMatches / leagueStats.totalMatches) * 100;
        const progressFill = document.getElementById('tournament-progress');
        const progressText = document.getElementById('progress-percentage');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${progressPercentage}%`;
            progressText.textContent = `${progressPercentage.toFixed(1)}%`;
        }
    }

    displayLeagueStats(leagueStats) {
        if (!leagueStats) return;

        // Best attack
        const bestAttack = document.getElementById('best-attack');
        if (bestAttack && leagueStats.bestAttack) {
            bestAttack.innerHTML = `
                <span class="team-name">${leagueStats.bestAttack.teamName}</span>
                <span class="stat-value">${leagueStats.bestAttack.goalsFor} أهداف</span>
            `;
        }

        // Best defense
        const bestDefense = document.getElementById('best-defense');
        if (bestDefense && leagueStats.bestDefense) {
            bestDefense.innerHTML = `
                <span class="team-name">${leagueStats.bestDefense.teamName}</span>
                <span class="stat-value">${leagueStats.bestDefense.goalsAgainst} أهداف</span>
            `;
        }

        // Win percentages
        document.getElementById('home-wins').textContent = `${leagueStats.homeWinPercentage}%`;
        document.getElementById('away-wins').textContent = `${leagueStats.awayWinPercentage}%`;
        document.getElementById('draw-percentage').textContent = `${leagueStats.drawPercentage}%`;

        // Top scorer team (most goals scored)
        const topScorerTeam = document.getElementById('top-scorer-team');
        if (topScorerTeam && leagueStats.bestAttack) {
            topScorerTeam.innerHTML = `
                <span class="team-name">${leagueStats.bestAttack.teamName}</span>
                <span class="stat-value">${leagueStats.bestAttack.goalsFor} أهداف</span>
            `;
        }
    }

    displayPlayoffPreview(standings) {
        const playoffSection = document.getElementById('playoff-section');
        if (!playoffSection) return;

        const qualifiedTeams = standings.filter(team => team.qualified);
        
        if (qualifiedTeams.length >= 4) {
            playoffSection.style.display = 'block';
            
            // Update semifinal matchups
            document.getElementById('team-1').textContent = qualifiedTeams[0].teamName;
            document.getElementById('team-4').textContent = qualifiedTeams[3].teamName;
            document.getElementById('team-2').textContent = qualifiedTeams[1].teamName;
            document.getElementById('team-3').textContent = qualifiedTeams[2].teamName;
        } else {
            playoffSection.style.display = 'none';
        }
    }

    showTeamDetails(team) {
        // Get detailed team statistics
        const teamStats = this.standingsCalculator.getTeamStats(team.teamId);
        
        if (!teamStats) return;

        // Create modal or navigate to team page
        const modal = this.createTeamModal(teamStats);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    createTeamModal(teamStats) {
        const modal = document.createElement('div');
        modal.className = 'team-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${teamStats.teamName}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="team-stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">المركز</span>
                            <span class="stat-value">${teamStats.position}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">النقاط</span>
                            <span class="stat-value">${teamStats.points}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">نسبة الفوز</span>
                            <span class="stat-value">${teamStats.winPercentage}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">متوسط النقاط</span>
                            <span class="stat-value">${teamStats.pointsPerGame}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">متوسط الأهداف</span>
                            <span class="stat-value">${teamStats.goalsPerGame}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">الشباك النظيفة</span>
                            <span class="stat-value">${teamStats.cleanSheets}</span>
                        </div>
                    </div>
                    
                    ${teamStats.biggestWin ? `
                        <div class="biggest-result">
                            <h3>أكبر فوز</h3>
                            <p>${teamStats.biggestWin.score} (اليوم ${teamStats.biggestWin.day})</p>
                        </div>
                    ` : ''}
                    
                    ${teamStats.biggestLoss ? `
                        <div class="biggest-result">
                            <h3>أكبر خسارة</h3>
                            <p>${teamStats.biggestLoss.score} (اليوم ${teamStats.biggestLoss.day})</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add close event
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.querySelector('.close-modal').click();
            }
        });

        return modal;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-standings');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshStandings();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Mobile navigation
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Back to top button
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Show/hide back to top button
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    backToTop.classList.add('show');
                } else {
                    backToTop.classList.remove('show');
                }
            });
        }
    }

    setupAutoRefresh() {
        // Refresh standings every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadStandings();
        }, 30000);
    }

    refreshStandings() {
        const refreshBtn = document.getElementById('refresh-standings');
        if (refreshBtn) {
            refreshBtn.textContent = 'جاري التحديث...';
            refreshBtn.disabled = true;
        }

        // Force recalculation of statistics
        this.standingsCalculator.updateStoredStatistics();
        
        // Reload standings
        this.loadStandings();

        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.textContent = 'تحديث الترتيب';
                refreshBtn.disabled = false;
            }
        }, 1000);
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

    updateLastUpdatedTime() {
        const updateTimeElement = document.getElementById('update-time');
        if (updateTimeElement) {
            const now = new Date();
            const timeString = now.toLocaleString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            updateTimeElement.textContent = timeString;
        }
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
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.classList.add('show');
        }, 10);

        setTimeout(() => {
            errorDiv.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 5000);
    }

    // Cleanup when page is unloaded
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StandingsController();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.standingsController) {
        window.standingsController.destroy();
    }
});