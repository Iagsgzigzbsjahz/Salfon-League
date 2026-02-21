/**
 * Fixtures Page Controller for Salfoon Ramadan League Platform
 * Handles fixtures display, filtering, and user interactions
 */

import LocalStorageManager from './storage.js';
import FixturesEngine from './fixturesEngine.js';

class FixturesController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.fixturesEngine = new FixturesEngine();
        this.currentView = 'list';
        this.currentFilters = {
            status: 'all',
            team: 'all',
            week: 'all',
            search: ''
        };
        
        this.init();
    }

    async init() {
        try {
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load fixtures and populate page
            this.loadFixtures();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing fixtures controller:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    loadFixtures() {
        try {
            // Get all fixtures
            const allFixtures = this.fixturesEngine.getAllFixtures();
            
            // Get match statistics
            const matchStats = this.fixturesEngine.getMatchStatistics();
            
            // Populate team filter
            this.populateTeamFilter();
            
            // Display fixtures
            this.displayFixtures(allFixtures);
            
            // Display statistics
            this.displayStatistics(matchStats);
            
            // Display next match
            this.displayNextMatch();
            
            // Display recent results
            this.displayRecentResults();
            
            // Check for postponed matches
            this.checkPostponedMatches();
            
        } catch (error) {
            console.error('Error loading fixtures:', error);
            this.showError('حدث خطأ في تحميل المباريات');
        }
    }

    populateTeamFilter() {
        const teamsData = this.storage.load(this.storage.keys.TEAMS);
        const teamFilter = document.getElementById('team-filter');
        
        if (!teamsData || !teamFilter) return;

        // Clear existing options (except "all")
        teamFilter.innerHTML = '<option value="all">جميع الفرق</option>';
        
        // Add team options
        teamsData.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamFilter.appendChild(option);
        });
    }

    displayFixtures(fixtures) {
        if (this.currentView === 'list') {
            this.displayListView(fixtures);
        } else {
            this.displayCalendarView(fixtures);
        }
    }

    displayListView(fixtures) {
        const container = document.getElementById('fixtures-container');
        if (!container) return;

        container.innerHTML = '';

        if (fixtures.length === 0) {
            container.innerHTML = '<div class="no-fixtures">لا توجد مباريات تطابق المعايير المحددة</div>';
            return;
        }

        // Group fixtures by day
        const groupedFixtures = this.groupFixturesByDay(fixtures);

        groupedFixtures.forEach(dayGroup => {
            const daySection = document.createElement('div');
            daySection.className = 'day-section';
            
            daySection.innerHTML = `
                <div class="day-header">
                    <h3>${dayGroup.dayName}</h3>
                    <span class="day-number">اليوم ${dayGroup.day}</span>
                </div>
                <div class="day-matches">
                    ${dayGroup.matches.map(match => this.createMatchCard(match)).join('')}
                </div>
            `;

            container.appendChild(daySection);
        });
    }

    displayCalendarView(fixtures) {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        container.innerHTML = '';

        // Create calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        // Create days 3-23
        for (let day = 3; day <= 23; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            const dayMatches = fixtures.filter(fixture => fixture.day === day);
            const hasMatches = dayMatches.length > 0;
            
            if (hasMatches) {
                dayCell.classList.add('has-matches');
            }

            dayCell.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-matches-count">${dayMatches.length} مباراة</div>
                ${dayMatches.map(match => `
                    <div class="mini-match ${match.status}" onclick="window.fixturesController.showMatchDetails('${match.id}')">
                        <div class="teams">${match.homeTeamInfo.shortName} × ${match.awayTeamInfo.shortName}</div>
                        <div class="result">${match.resultText}</div>
                    </div>
                `).join('')}
            `;

            calendarGrid.appendChild(dayCell);
        }

        container.appendChild(calendarGrid);
    }

    groupFixturesByDay(fixtures) {
        const grouped = {};
        
        fixtures.forEach(fixture => {
            if (!grouped[fixture.day]) {
                grouped[fixture.day] = {
                    day: fixture.day,
                    dayName: fixture.dayName,
                    matches: []
                };
            }
            grouped[fixture.day].matches.push(fixture);
        });

        return Object.values(grouped).sort((a, b) => a.day - b.day);
    }

    createMatchCard(match) {
        const statusClass = match.status;
        const resultClass = this.fixturesEngine.getMatchResultClass(match);
        
        return `
            <div class="match-card ${statusClass} ${resultClass}" onclick="window.fixturesController.showMatchDetails('${match.id}')">
                <div class="match-time">
                    <span class="time">${match.formattedTime}</span>
                    <span class="status">${match.statusText}</span>
                </div>
                
                <div class="match-teams">
                    <div class="home-team">
                        <img src="${match.homeTeamInfo.logo}" alt="${match.homeTeamInfo.name}" class="team-logo" 
                             onerror="this.src='images/default-team.png'">
                        <span class="team-name">${match.homeTeamInfo.name}</span>
                    </div>
                    
                    <div class="match-score">
                        ${match.status === 'played' ? 
                            `<span class="score">${match.homeGoals} - ${match.awayGoals}</span>` :
                            match.status === 'postponed' ? 
                                '<span class="postponed-text">مؤجلة</span>' :
                                '<span class="vs">×</span>'
                        }
                    </div>
                    
                    <div class="away-team">
                        <img src="${match.awayTeamInfo.logo}" alt="${match.awayTeamInfo.name}" class="team-logo" 
                             onerror="this.src='images/default-team.png'">
                        <span class="team-name">${match.awayTeamInfo.name}</span>
                    </div>
                </div>
                
                ${match.status === 'postponed' && match.postponementReason ? 
                    `<div class="postponement-reason">السبب: ${match.postponementReason}</div>` : ''
                }
                
                ${match.bestPlayer ? 
                    `<div class="best-player">أفضل لاعب: ${match.bestPlayer}</div>` : ''
                }
            </div>
        `;
    }

    displayStatistics(stats) {
        if (!stats) return;

        document.getElementById('total-matches').textContent = stats.total;
        document.getElementById('played-count').textContent = stats.played;
        document.getElementById('scheduled-count').textContent = stats.scheduled;
        document.getElementById('postponed-count').textContent = stats.postponed;
        document.getElementById('total-goals').textContent = stats.totalGoals;
        document.getElementById('average-goals').textContent = stats.averageGoals;
        document.getElementById('home-wins').textContent = stats.homeWins;
        document.getElementById('away-wins').textContent = stats.awayWins;
        document.getElementById('draws').textContent = stats.draws;

        // Highest scoring match
        const highestScoringElement = document.getElementById('highest-scoring');
        if (highestScoringElement && stats.highestScoringMatch) {
            const match = stats.highestScoringMatch;
            highestScoringElement.innerHTML = `
                <span class="match-teams">${match.homeTeamInfo.shortName} × ${match.awayTeamInfo.shortName}</span>
                <span class="match-score">${match.homeGoals}-${match.awayGoals}</span>
            `;
        }
    }

    displayNextMatch() {
        const nextMatch = this.fixturesEngine.getNextMatch();
        const nextMatchCard = document.getElementById('next-match-card');
        const nextMatchSection = document.getElementById('next-match-section');

        if (!nextMatch || !nextMatchCard || !nextMatchSection) {
            if (nextMatchSection) nextMatchSection.style.display = 'none';
            return;
        }

        nextMatchSection.style.display = 'block';
        nextMatchCard.innerHTML = this.createMatchCard(nextMatch);
    }

    displayRecentResults() {
        const recentResults = this.fixturesEngine.getRecentResults(3);
        const resultsList = document.getElementById('recent-results-list');
        const resultsSection = document.getElementById('recent-results-section');

        if (!recentResults.length || !resultsList || !resultsSection) {
            if (resultsSection) resultsSection.style.display = 'none';
            return;
        }

        resultsSection.style.display = 'block';
        resultsList.innerHTML = recentResults.map(match => this.createMatchCard(match)).join('');
    }

    checkPostponedMatches() {
        const postponedMatches = this.fixturesEngine.getPostponedMatches();
        const postponedAlert = document.getElementById('postponed-alert');
        const postponedList = document.getElementById('postponed-matches-list');

        if (!postponedMatches.length || !postponedAlert || !postponedList) {
            if (postponedAlert) postponedAlert.style.display = 'none';
            return;
        }

        postponedAlert.style.display = 'block';
        postponedList.innerHTML = postponedMatches.map(match => `
            <div class="postponed-match">
                <span class="match-info">${match.homeTeamInfo.name} × ${match.awayTeamInfo.name}</span>
                <span class="postponement-reason">${match.postponementReason}</span>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('team-filter')?.addEventListener('change', (e) => {
            this.currentFilters.team = e.target.value;
            this.applyFilters();
        });

        document.getElementById('week-filter')?.addEventListener('change', (e) => {
            this.currentFilters.week = e.target.value;
            this.applyFilters();
        });

        // Search
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.applyFilters();
        });

        document.getElementById('clear-search')?.addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.currentFilters.search = '';
            this.applyFilters();
        });

        // View controls
        document.getElementById('view-list')?.addEventListener('click', () => {
            this.switchView('list');
        });

        document.getElementById('view-calendar')?.addEventListener('click', () => {
            this.switchView('calendar');
        });

        // Export
        document.getElementById('export-fixtures')?.addEventListener('click', () => {
            this.exportFixtures();
        });

        // Modal controls
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('match-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'match-modal') {
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

    applyFilters() {
        let fixtures = this.fixturesEngine.getAllFixtures();

        // Apply status filter
        if (this.currentFilters.status !== 'all') {
            fixtures = fixtures.filter(fixture => fixture.status === this.currentFilters.status);
        }

        // Apply team filter
        if (this.currentFilters.team !== 'all') {
            fixtures = fixtures.filter(fixture => 
                fixture.homeTeam === this.currentFilters.team || 
                fixture.awayTeam === this.currentFilters.team
            );
        }

        // Apply week filter
        if (this.currentFilters.week !== 'all') {
            const weekRanges = {
                'week1': { start: 3, end: 9 },
                'week2': { start: 10, end: 16 },
                'week3': { start: 17, end: 23 }
            };
            const range = weekRanges[this.currentFilters.week];
            if (range) {
                fixtures = fixtures.filter(fixture => 
                    fixture.day >= range.start && fixture.day <= range.end
                );
            }
        }

        // Apply search filter
        if (this.currentFilters.search) {
            fixtures = this.fixturesEngine.searchFixtures(this.currentFilters.search);
        }

        this.displayFixtures(fixtures);
    }

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('view-list')?.classList.toggle('active', view === 'list');
        document.getElementById('view-calendar')?.classList.toggle('active', view === 'calendar');
        
        // Show/hide views
        document.getElementById('list-view').style.display = view === 'list' ? 'block' : 'none';
        document.getElementById('calendar-view').style.display = view === 'calendar' ? 'block' : 'none';
        
        // Reload fixtures in new view
        this.applyFilters();
    }

    showMatchDetails(matchId) {
        const match = this.fixturesEngine.getAllFixtures().find(f => f.id === matchId);
        if (!match) return;

        const modal = document.getElementById('match-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = `${match.homeTeamInfo.name} × ${match.awayTeamInfo.name}`;
        
        modalBody.innerHTML = `
            <div class="match-details">
                <div class="match-header">
                    <div class="match-date">${match.dayName}</div>
                    <div class="match-time">${match.formattedTime}</div>
                    <div class="match-status ${match.status}">${match.statusText}</div>
                </div>
                
                <div class="teams-detail">
                    <div class="team-detail home">
                        <img src="${match.homeTeamInfo.logo}" alt="${match.homeTeamInfo.name}" class="team-logo">
                        <h3>${match.homeTeamInfo.name}</h3>
                        ${match.status === 'played' ? `<div class="team-score">${match.homeGoals}</div>` : ''}
                    </div>
                    
                    <div class="vs-section">
                        ${match.status === 'played' ? 
                            '<div class="final-score">النتيجة النهائية</div>' : 
                            '<div class="vs">×</div>'
                        }
                    </div>
                    
                    <div class="team-detail away">
                        <img src="${match.awayTeamInfo.logo}" alt="${match.awayTeamInfo.name}" class="team-logo">
                        <h3>${match.awayTeamInfo.name}</h3>
                        ${match.status === 'played' ? `<div class="team-score">${match.awayGoals}</div>` : ''}
                    </div>
                </div>
                
                ${match.bestPlayer ? `
                    <div class="match-info">
                        <h4>أفضل لاعب في المباراة</h4>
                        <p>${match.bestPlayer}</p>
                    </div>
                ` : ''}
                
                ${match.status === 'postponed' && match.postponementReason ? `
                    <div class="match-info postponement">
                        <h4>سبب التأجيل</h4>
                        <p>${match.postponementReason}</p>
                    </div>
                ` : ''}
                
                <div class="match-actions">
                    <button onclick="window.fixturesController.closeModal()" class="btn-secondary">إغلاق</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeModal() {
        const modal = document.getElementById('match-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    exportFixtures() {
        try {
            const fixtures = this.fixturesEngine.getAllFixtures();
            const csvContent = this.fixturesEngine.exportFixtures('csv');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'fixtures_salfoon_ramadan_league.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error exporting fixtures:', error);
            this.showError('حدث خطأ في تصدير الجدول');
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
    window.fixturesController = new FixturesController();
});