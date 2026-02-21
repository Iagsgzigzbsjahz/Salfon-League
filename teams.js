/**
 * Teams Page Controller for Salfoon Ramadan League Platform
 * Handles teams display, comparison, and detailed information
 */

import LocalStorageManager from './storage.js';
import TeamsEngine from './teamsEngine.js';

class TeamsController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.teamsEngine = new TeamsEngine();
        this.currentView = 'grid';
        this.currentRanking = 'points';
        this.teams = [];
        this.rankings = null;
        
        this.init();
    }

    async init() {
        try {
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load teams data
            this.loadTeamsData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing teams controller:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    loadTeamsData() {
        try {
            // Get all teams with enhanced data
            this.teams = this.teamsEngine.getAllTeams();
            
            // Get league rankings
            this.rankings = this.teamsEngine.getLeagueRankings();
            
            // Display teams
            this.displayTeams();
            
            // Display tournament overview
            this.displayTournamentOverview();
            
            // Display league rankings
            this.displayLeagueRankings();
            
            // Populate team selectors
            this.populateTeamSelectors();
            
            // Display awards
            this.displayTeamAwards();
            
        } catch (error) {
            console.error('Error loading teams data:', error);
            this.showError('حدث خطأ في تحميل بيانات الفرق');
        }
    }

    displayTournamentOverview() {
        const qualifiedTeams = this.teams.filter(team => team.qualified).length;
        const totalPlayers = this.teams.reduce((sum, team) => sum + (team.squad?.length || 6), 0);
        const averageGoals = this.teams.length > 0 ? 
            (this.teams.reduce((sum, team) => sum + team.statistics.goalsFor, 0) / this.teams.length).toFixed(1) : 0;

        document.getElementById('qualified-teams').textContent = qualifiedTeams;
        document.getElementById('total-players').textContent = totalPlayers;
        document.getElementById('average-goals').textContent = averageGoals;
    }

    displayTeams() {
        const container = document.getElementById('teams-container');
        if (!container) return;

        if (this.currentView === 'grid') {
            container.className = 'teams-grid';
            container.innerHTML = this.teams.map(team => this.createTeamCard(team)).join('');
        } else {
            container.className = 'teams-list';
            container.innerHTML = this.teams.map(team => this.createTeamListItem(team)).join('');
        }
    }

    createTeamCard(team) {
        const positionClass = team.qualified ? 'qualified' : 'not-qualified';
        const formDisplay = team.form ? team.form.slice(-5).map(result => {
            const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
            const displayText = result === 'W' ? 'ف' : result === 'D' ? 'ت' : 'خ';
            return `<span class="form-result ${className}">${displayText}</span>`;
        }).join('') : '';

        return `
            <div class="team-card ${positionClass}" onclick="window.teamsController.showTeamDetails('${team.id}')">
                <div class="team-header">
                    <img src="${team.logo}" alt="${team.name}" class="team-logo" 
                         onerror="this.src='images/default-team.png'">
                    <div class="team-info">
                        <h3 class="team-name">${team.name}</h3>
                        <p class="team-short-name">${team.shortName}</p>
                    </div>
                    ${team.currentPosition ? `<div class="team-position">#${team.currentPosition}</div>` : ''}
                </div>
                
                <div class="team-stats">
                    <div class="stat-row">
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.points}</span>
                            <span class="stat-label">نقطة</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.played}</span>
                            <span class="stat-label">لعب</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                            <span class="stat-label">الفارق</span>
                        </div>
                    </div>
                    
                    <div class="team-record">
                        <span class="wins">${team.statistics.won} فوز</span>
                        <span class="draws">${team.statistics.drawn} تعادل</span>
                        <span class="losses">${team.statistics.lost} خسارة</span>
                    </div>
                </div>
                
                ${team.form && team.form.length > 0 ? `
                    <div class="team-form">
                        <span class="form-label">الشكل:</span>
                        <div class="form-results">${formDisplay}</div>
                    </div>
                ` : ''}
                
                <div class="team-status">
                    <span class="qualification-status ${team.qualified ? 'qualified' : 'not-qualified'}">
                        ${team.qualificationStatus || (team.qualified ? 'مؤهل للنهائيات' : 'خارج التأهل')}
                    </span>
                </div>
                
                ${team.fixtures?.next ? `
                    <div class="next-match">
                        <span class="next-match-label">المباراة القادمة:</span>
                        <span class="next-match-info">
                            ${team.fixtures.next.homeTeam === team.id ? 
                                `× ${team.fixtures.next.awayTeamInfo.shortName}` : 
                                `${team.fixtures.next.homeTeamInfo.shortName} ×`
                            }
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createTeamListItem(team) {
        return `
            <div class="team-list-item" onclick="window.teamsController.showTeamDetails('${team.id}')">
                <div class="team-basic-info">
                    <img src="${team.logo}" alt="${team.name}" class="team-logo-small" 
                         onerror="this.src='images/default-team.png'">
                    <div class="team-details">
                        <h4 class="team-name">${team.name}</h4>
                        <p class="team-founded">تأسس عام ${team.founded}</p>
                    </div>
                </div>
                
                <div class="team-stats-row">
                    <div class="stat-group">
                        <span class="stat-label">المركز:</span>
                        <span class="stat-value">${team.currentPosition || '-'}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">النقاط:</span>
                        <span class="stat-value">${team.statistics.points}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">الأهداف:</span>
                        <span class="stat-value">${team.statistics.goalsFor}-${team.statistics.goalsAgainst}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">الحالة:</span>
                        <span class="stat-value ${team.qualified ? 'qualified' : 'not-qualified'}">
                            ${team.qualified ? 'مؤهل' : 'غير مؤهل'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    displayLeagueRankings() {
        if (!this.rankings) return;

        const container = document.getElementById('rankings-content');
        if (!container) return;

        const currentRankingData = this.rankings[this.currentRanking];
        if (!currentRankingData) return;

        container.innerHTML = currentRankingData.slice(0, 7).map((team, index) => {
            let statValue = '';
            switch (this.currentRanking) {
                case 'points':
                    statValue = `${team.statistics.points} نقطة`;
                    break;
                case 'goalsScored':
                    statValue = `${team.statistics.goalsFor} هدف`;
                    break;
                case 'goalsConceded':
                    statValue = `${team.statistics.goalsAgainst} هدف`;
                    break;
                case 'cleanSheets':
                    statValue = `${team.additionalStats?.cleanSheets || 0} مباراة`;
                    break;
            }

            return `
                <div class="ranking-item" onclick="window.teamsController.showTeamDetails('${team.id}')">
                    <span class="ranking-position">${index + 1}</span>
                    <img src="${team.logo}" alt="${team.name}" class="ranking-logo" 
                         onerror="this.src='images/default-team.png'">
                    <span class="ranking-team-name">${team.name}</span>
                    <span class="ranking-stat">${statValue}</span>
                </div>
            `;
        }).join('');
    }

    populateTeamSelectors() {
        const team1Select = document.getElementById('team1-select');
        const team2Select = document.getElementById('team2-select');
        
        if (!team1Select || !team2Select) return;

        const options = this.teams.map(team => 
            `<option value="${team.id}">${team.name}</option>`
        ).join('');

        team1Select.innerHTML = '<option value="">اختر فريق</option>' + options;
        team2Select.innerHTML = '<option value="">اختر فريق</option>' + options;
    }

    compareTeams() {
        const team1Id = document.getElementById('team1-select').value;
        const team2Id = document.getElementById('team2-select').value;
        
        if (!team1Id || !team2Id) {
            this.showError('يرجى اختيار فريقين للمقارنة');
            return;
        }

        if (team1Id === team2Id) {
            this.showError('يرجى اختيار فريقين مختلفين');
            return;
        }

        const comparison = this.teamsEngine.compareTeams(team1Id, team2Id);
        if (!comparison) {
            this.showError('حدث خطأ في المقارنة');
            return;
        }

        this.displayComparison(comparison);
    }

    displayComparison(comparison) {
        const container = document.getElementById('comparison-result');
        if (!container) return;

        const { team1, team2, headToHead, comparison: comp } = comparison;

        container.innerHTML = `
            <div class="comparison-header">
                <div class="comparison-team">
                    <img src="${team1.logo}" alt="${team1.name}" class="comparison-logo" 
                         onerror="this.src='images/default-team.png'">
                    <h3>${team1.name}</h3>
                </div>
                <div class="vs-divider">×</div>
                <div class="comparison-team">
                    <img src="${team2.logo}" alt="${team2.name}" class="comparison-logo" 
                         onerror="this.src='images/default-team.png'">
                    <h3>${team2.name}</h3>
                </div>
            </div>
            
            <div class="comparison-stats">
                <div class="comparison-row">
                    <div class="stat-comparison">
                        <span class="team1-stat ${comp.position.better === 'team1' ? 'better' : ''}">${comp.position.team1}</span>
                        <span class="stat-label">المركز</span>
                        <span class="team2-stat ${comp.position.better === 'team2' ? 'better' : ''}">${comp.position.team2}</span>
                    </div>
                </div>
                
                <div class="comparison-row">
                    <div class="stat-comparison">
                        <span class="team1-stat ${comp.points.better === 'team1' ? 'better' : ''}">${comp.points.team1}</span>
                        <span class="stat-label">النقاط</span>
                        <span class="team2-stat ${comp.points.better === 'team2' ? 'better' : ''}">${comp.points.team2}</span>
                    </div>
                </div>
                
                <div class="comparison-row">
                    <div class="stat-comparison">
                        <span class="team1-stat ${comp.goalDifference.better === 'team1' ? 'better' : ''}">${comp.goalDifference.team1 > 0 ? '+' : ''}${comp.goalDifference.team1}</span>
                        <span class="stat-label">فارق الأهداف</span>
                        <span class="team2-stat ${comp.goalDifference.better === 'team2' ? 'better' : ''}">${comp.goalDifference.team2 > 0 ? '+' : ''}${comp.goalDifference.team2}</span>
                    </div>
                </div>
                
                <div class="comparison-row">
                    <div class="stat-comparison">
                        <span class="team1-stat ${comp.goalsScored.better === 'team1' ? 'better' : ''}">${comp.goalsScored.team1}</span>
                        <span class="stat-label">الأهداف المسجلة</span>
                        <span class="team2-stat ${comp.goalsScored.better === 'team2' ? 'better' : ''}">${comp.goalsScored.team2}</span>
                    </div>
                </div>
            </div>
            
            ${headToHead.played > 0 ? `
                <div class="head-to-head">
                    <h4>المواجهات المباشرة</h4>
                    <div class="h2h-stats">
                        <div class="h2h-record">
                            <span class="team1-wins">${headToHead.team1Wins}</span>
                            <span class="h2h-label">فوز ${team1.shortName}</span>
                        </div>
                        <div class="h2h-record">
                            <span class="draws">${headToHead.draws}</span>
                            <span class="h2h-label">تعادل</span>
                        </div>
                        <div class="h2h-record">
                            <span class="team2-wins">${headToHead.team2Wins}</span>
                            <span class="h2h-label">فوز ${team2.shortName}</span>
                        </div>
                    </div>
                    <div class="h2h-goals">
                        <span>الأهداف: ${headToHead.team1Goals} - ${headToHead.team2Goals}</span>
                    </div>
                </div>
            ` : '<div class="no-h2h">لم يلتقي الفريقان بعد</div>'}
        `;

        container.style.display = 'block';
    }

    displayTeamAwards() {
        const container = document.getElementById('awards-container');
        if (!container) return;

        const allAwards = [];
        this.teams.forEach(team => {
            const teamAwards = this.teamsEngine.getTeamAwards(team.id);
            teamAwards.forEach(award => {
                allAwards.push({
                    ...award,
                    team: team
                });
            });
        });

        if (allAwards.length === 0) {
            container.innerHTML = '<p class="no-awards">لا توجد جوائز محددة بعد</p>';
            return;
        }

        container.innerHTML = allAwards.map(award => `
            <div class="award-item" onclick="window.teamsController.showTeamDetails('${award.team.id}')">
                <div class="award-icon">${award.icon}</div>
                <div class="award-info">
                    <h4 class="award-title">${award.title}</h4>
                    <p class="award-description">${award.description}</p>
                    <span class="award-team">${award.team.name}</span>
                </div>
            </div>
        `).join('');
    }

    showTeamDetails(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        const modal = document.getElementById('team-modal');
        const modalTitle = document.getElementById('team-modal-title');
        const modalBody = document.getElementById('team-modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = team.name;

        // Get team trends
        const trends = this.teamsEngine.getTeamTrends(teamId);
        const awards = this.teamsEngine.getTeamAwards(teamId);

        modalBody.innerHTML = `
            <div class="team-details">
                <div class="team-profile">
                    <div class="team-header-detail">
                        <img src="${team.logo}" alt="${team.name}" class="team-logo-large" 
                             onerror="this.src='images/default-team.png'">
                        <div class="team-info-detail">
                            <h2>${team.name}</h2>
                            <p class="team-short">${team.shortName}</p>
                            <p class="team-founded">تأسس عام ${team.founded}</p>
                            <div class="team-colors">
                                <span class="color-swatch" style="background-color: ${team.colors.primary}"></span>
                                <span class="color-swatch" style="background-color: ${team.colors.secondary}"></span>
                            </div>
                        </div>
                        <div class="team-position-detail">
                            <div class="position-number">${team.currentPosition || '-'}</div>
                            <div class="position-label">المركز</div>
                        </div>
                    </div>
                </div>
                
                <div class="team-stats-detail">
                    <h3>الإحصائيات</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.points}</span>
                            <span class="stat-label">النقاط</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.played}</span>
                            <span class="stat-label">مباريات لعبت</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.won}</span>
                            <span class="stat-label">انتصارات</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.drawn}</span>
                            <span class="stat-label">تعادلات</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.lost}</span>
                            <span class="stat-label">هزائم</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.goalsFor}</span>
                            <span class="stat-label">أهداف مسجلة</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${team.statistics.goalsAgainst}</span>
                            <span class="stat-label">أهداف مستقبلة</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value ${team.goalDifference >= 0 ? 'positive' : 'negative'}">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</span>
                            <span class="stat-label">فارق الأهداف</span>
                        </div>
                    </div>
                </div>
                
                ${team.additionalStats ? `
                    <div class="additional-stats">
                        <h3>إحصائيات إضافية</h3>
                        <div class="additional-stats-grid">
                            <div class="stat-item">
                                <span class="stat-value">${team.additionalStats.averageGoalsScored}</span>
                                <span class="stat-label">متوسط الأهداف المسجلة</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${team.additionalStats.averageGoalsConceded}</span>
                                <span class="stat-label">متوسط الأهداف المستقبلة</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${team.additionalStats.cleanSheets}</span>
                                <span class="stat-label">شباك نظيفة</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${team.additionalStats.winningStreak}</span>
                                <span class="stat-label">سلسلة انتصارات</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${team.squad && team.squad.length > 0 ? `
                    <div class="team-squad">
                        <h3>تشكيلة الفريق</h3>
                        <div class="squad-list">
                            ${team.squad.map(player => `
                                <div class="player-item">
                                    <span class="player-number">${player.number}</span>
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-position">${player.position}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${awards.length > 0 ? `
                    <div class="team-awards-detail">
                        <h3>الجوائز والإنجازات</h3>
                        <div class="awards-list">
                            ${awards.map(award => `
                                <div class="award-badge">
                                    <span class="award-icon">${award.icon}</span>
                                    <div class="award-text">
                                        <strong>${award.title}</strong>
                                        <p>${award.description}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="team-fixtures-summary">
                    <h3>ملخص المباريات</h3>
                    <div class="fixtures-stats">
                        <div class="fixture-stat">
                            <span class="stat-value">${team.fixtures?.total || 0}</span>
                            <span class="stat-label">إجمالي المباريات</span>
                        </div>
                        <div class="fixture-stat">
                            <span class="stat-value">${team.fixtures?.played || 0}</span>
                            <span class="stat-label">مباريات لعبت</span>
                        </div>
                        <div class="fixture-stat">
                            <span class="stat-value">${team.fixtures?.scheduled || 0}</span>
                            <span class="stat-label">مباريات متبقية</span>
                        </div>
                    </div>
                    
                    ${team.fixtures?.next ? `
                        <div class="next-fixture">
                            <h4>المباراة القادمة</h4>
                            <div class="fixture-info">
                                <span class="fixture-teams">
                                    ${team.fixtures.next.homeTeam === team.id ? 
                                        `${team.name} × ${team.fixtures.next.awayTeamInfo.name}` : 
                                        `${team.fixtures.next.homeTeamInfo.name} × ${team.name}`
                                    }
                                </span>
                                <span class="fixture-date">${team.fixtures.next.dayName}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    setupEventListeners() {
        // View controls
        document.getElementById('grid-view')?.addEventListener('click', () => {
            this.switchView('grid');
        });

        document.getElementById('list-view')?.addEventListener('click', () => {
            this.switchView('list');
        });

        // Ranking tabs
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchRanking(tab.dataset.ranking);
            });
        });

        // Team comparison
        document.getElementById('compare-btn')?.addEventListener('click', () => {
            this.compareTeams();
        });

        // Modal controls
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('team-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'team-modal') {
                this.closeModal();
            }
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

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('grid-view')?.classList.toggle('active', view === 'grid');
        document.getElementById('list-view')?.classList.toggle('active', view === 'list');
        
        // Redisplay teams
        this.displayTeams();
    }

    switchRanking(ranking) {
        this.currentRanking = ranking;
        
        // Update tab states
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.ranking === ranking);
        });
        
        // Redisplay rankings
        this.displayLeagueRankings();
    }

    closeModal() {
        const modal = document.getElementById('team-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teamsController = new TeamsController();
});