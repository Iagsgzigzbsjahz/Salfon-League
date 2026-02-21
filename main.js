/**
 * Main UI Controller for Salfoon Ramadan League Platform
 * Handles homepage functionality, navigation, and user interactions
 */

import LocalStorageManager from './storage.js';
import TournamentSystem from './tournamentEngine.js';
import StandingsEngine from './standingsEngine.js';
import FixturesEngine from './fixturesEngine.js';
import NewsEngine from './newsEngine.js';

class MainUIController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.tournament = new TournamentSystem();
        this.standings = new StandingsEngine();
        this.fixtures = new FixturesEngine();
        this.news = new NewsEngine();
        
        this.isLoading = true;
        this.currentTheme = 'light';
        
        this.init();
    }

    /**
     * Initialize the main controller
     */
    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load user preferences
            this.loadUserPreferences();
            
            // Initialize UI components
            this.initializeNavigation();
            this.initializeThemeToggle();
            this.initializeBackToTop();
            
            // Load homepage content
            await this.loadHomepageContent();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Set up auto-refresh for live data
            this.setupAutoRefresh();
            
        } catch (error) {
            console.error('Error initializing main controller:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    this.isLoading = false;
                }, 300);
            }, 500);
        }
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        const preferences = this.storage.load(this.storage.keys.USER_PREFERENCES);
        if (preferences) {
            this.currentTheme = preferences.darkMode ? 'dark' : 'light';
            this.applyTheme(this.currentTheme);
        }
    }

    /**
     * Initialize navigation functionality
     */
    initializeNavigation() {
        // Mobile menu toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar') && navMenu?.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle?.classList.remove('active');
            }
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Initialize theme toggle functionality
     */
    initializeThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.saveUserPreferences();
    }

    /**
     * Apply theme to the page
     */
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        const preferences = this.storage.load(this.storage.keys.USER_PREFERENCES) || {};
        preferences.darkMode = this.currentTheme === 'dark';
        this.storage.save(this.storage.keys.USER_PREFERENCES, preferences);
    }

    /**
     * Initialize back to top button
     */
    initializeBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');
        
        if (backToTopBtn) {
            // Show/hide button based on scroll position
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    backToTopBtn.classList.add('visible');
                } else {
                    backToTopBtn.classList.remove('visible');
                }
            });

            // Scroll to top when clicked
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    /**
     * Load homepage content
     */
    async loadHomepageContent() {
        try {
            // Load all content in parallel
            await Promise.all([
                this.loadNextMatch(),
                this.loadLastMatch(),
                this.loadTopStandings(),
                this.loadLatestNews()
            ]);
        } catch (error) {
            console.error('Error loading homepage content:', error);
        }
    }

    /**
     * Load next match information
     */
    async loadNextMatch() {
        try {
            const nextMatch = this.tournament.getNextMatch();
            const nextMatchCard = document.getElementById('next-match-card');
            const countdownTimer = document.getElementById('countdown-timer');

            if (!nextMatchCard) return;

            if (nextMatch) {
                const teamsData = this.storage.load(this.storage.keys.TEAMS);
                const homeTeam = teamsData.teams.find(t => t.id === nextMatch.homeTeam);
                const awayTeam = teamsData.teams.find(t => t.id === nextMatch.awayTeam);

                nextMatchCard.innerHTML = `
                    <div class="match-teams">
                        <div class="team home-team">
                            <img src="${homeTeam.logo}" alt="${homeTeam.name}" class="team-logo">
                            <span class="team-name">${homeTeam.name}</span>
                        </div>
                        <div class="match-info">
                            <div class="match-day">اليوم ${nextMatch.day} رمضان</div>
                            <div class="match-time">${nextMatch.matchTime}</div>
                            <div class="vs">×</div>
                        </div>
                        <div class="team away-team">
                            <span class="team-name">${awayTeam.name}</span>
                            <img src="${awayTeam.logo}" alt="${awayTeam.name}" class="team-logo">
                        </div>
                    </div>
                `;

                // Start countdown timer
                this.startCountdown(nextMatch, countdownTimer);
            } else {
                nextMatchCard.innerHTML = `
                    <div class="no-matches">
                        <p>لا توجد مباريات مجدولة</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading next match:', error);
        }
    }

    /**
     * Start countdown timer for next match
     */
    startCountdown(match, timerElement) {
        if (!timerElement || !match) return;

        // For demo purposes, assume matches are at 8 PM on the specified Ramadan day
        // In a real implementation, you'd have actual dates
        const updateTimer = () => {
            timerElement.innerHTML = `
                <div class="countdown-item">
                    <span class="countdown-number">--</span>
                    <span class="countdown-label">أيام</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-number">--</span>
                    <span class="countdown-label">ساعات</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-number">--</span>
                    <span class="countdown-label">دقائق</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-number">--</span>
                    <span class="countdown-label">ثواني</span>
                </div>
            `;
        };

        updateTimer();
        // In a real implementation, you'd calculate actual time difference
        // setInterval(updateTimer, 1000);
    }

    /**
     * Load last match result
     */
    async loadLastMatch() {
        try {
            const lastMatch = this.tournament.getLastMatch();
            const lastMatchResult = document.getElementById('last-match-result');

            if (!lastMatchResult) return;

            if (lastMatch) {
                const teamsData = this.storage.load(this.storage.keys.TEAMS);
                const homeTeam = teamsData.teams.find(t => t.id === lastMatch.homeTeam);
                const awayTeam = teamsData.teams.find(t => t.id === lastMatch.awayTeam);

                lastMatchResult.innerHTML = `
                    <div class="result-card">
                        <div class="match-header">
                            <span class="match-day">اليوم ${lastMatch.day} رمضان</span>
                            <span class="match-status">انتهت</span>
                        </div>
                        <div class="result-teams">
                            <div class="team-result home">
                                <img src="${homeTeam.logo}" alt="${homeTeam.name}" class="team-logo">
                                <span class="team-name">${homeTeam.name}</span>
                                <span class="team-score">${lastMatch.homeGoals}</span>
                            </div>
                            <div class="result-separator">-</div>
                            <div class="team-result away">
                                <span class="team-score">${lastMatch.awayGoals}</span>
                                <span class="team-name">${awayTeam.name}</span>
                                <img src="${awayTeam.logo}" alt="${awayTeam.name}" class="team-logo">
                            </div>
                        </div>
                        ${lastMatch.bestPlayer ? `
                            <div class="best-player">
                                <span class="best-player-label">أفضل لاعب:</span>
                                <span class="best-player-name">${lastMatch.bestPlayer}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                lastMatchResult.innerHTML = `
                    <div class="no-results">
                        <p>لا توجد نتائج بعد</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading last match:', error);
        }
    }

    /**
     * Load top 4 standings preview
     */
    async loadTopStandings() {
        try {
            const standings = this.standings.calculateStandings();
            const topStandingsElement = document.getElementById('top-standings');

            if (!topStandingsElement || !standings) return;

            const topFour = standings.slice(0, 4);
            const teamsData = this.storage.load(this.storage.keys.TEAMS);

            const standingsHTML = `
                <table class="standings-preview-table">
                    <thead>
                        <tr>
                            <th>المركز</th>
                            <th>الفريق</th>
                            <th>لعب</th>
                            <th>النقاط</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topFour.map((team, index) => {
                            const teamData = teamsData.teams.find(t => t.id === team.teamId);
                            return `
                                <tr class="qualified-team">
                                    <td class="position">${index + 1}</td>
                                    <td class="team-info">
                                        <img src="${teamData.logo}" alt="${teamData.name}" class="team-logo-small">
                                        <span class="team-name">${teamData.name}</span>
                                    </td>
                                    <td class="played">${team.played}</td>
                                    <td class="points">${team.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;

            topStandingsElement.innerHTML = standingsHTML;
        } catch (error) {
            console.error('Error loading top standings:', error);
        }
    }

    /**
     * Load latest news preview
     */
    async loadLatestNews() {
        try {
            const latestNews = this.news.getLatestNews(3);
            const newsPreview = document.getElementById('news-preview');

            if (!newsPreview) return;

            if (latestNews && latestNews.length > 0) {
                const newsHTML = latestNews.map(article => `
                    <article class="news-card">
                        ${article.image ? `
                            <div class="news-image">
                                <img src="${article.image}" alt="${article.title}" loading="lazy">
                            </div>
                        ` : ''}
                        <div class="news-content">
                            <h3 class="news-title">${article.title}</h3>
                            <p class="news-excerpt">${this.truncateText(article.content, 100)}</p>
                            <div class="news-meta">
                                <span class="news-date">${this.formatDate(article.publishDate)}</span>
                                <span class="news-category">${this.getCategoryName(article.category)}</span>
                            </div>
                        </div>
                    </article>
                `).join('');

                newsPreview.innerHTML = newsHTML;
            } else {
                newsPreview.innerHTML = `
                    <div class="no-news">
                        <p>لا توجد أخبار حالياً</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading latest news:', error);
        }
    }

    /**
     * Setup auto-refresh for live data
     */
    setupAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.loadHomepageContent();
            }
        }, 30000);
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('Initialization failed:', error);
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h2>خطأ في التحميل</h2>
                <p>حدث خطأ أثناء تحميل البيانات. يرجى إعادة تحميل الصفحة.</p>
                <button onclick="location.reload()" class="retry-btn">إعادة المحاولة</button>
            </div>
        `;
        
        document.body.appendChild(errorMessage);
        this.hideLoadingScreen();
    }

    /**
     * Utility function to truncate text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Utility function to format date
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Get category name in Arabic
     */
    getCategoryName(category) {
        const categories = {
            'match-report': 'تقرير مباراة',
            'announcement': 'إعلان',
            'general': 'عام',
            'postponement': 'تأجيل'
        };
        return categories[category] || 'عام';
    }
}

// Initialize the main controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MainUIController();
});

// Export for potential use in other modules
export default MainUIController;