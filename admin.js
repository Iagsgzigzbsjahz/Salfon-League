/**
 * Admin Panel Interface Controller for Salfoon Ramadan League Platform
 * Handles admin UI interactions and operations
 */

import AdminController from './adminController.js';
import FixturesEngine from './fixturesEngine.js';
import NewsEngine from './newsEngine.js';

class AdminInterface {
    constructor() {
        this.adminController = new AdminController();
        this.fixturesEngine = new FixturesEngine();
        this.newsEngine = new NewsEngine();
        this.currentSection = 'dashboard';
        this.currentMatchId = null;
        this.currentNewsId = null;
        
        this.init();
    }

    async init() {
        try {
            await this.adminController.init();
            
            // Check if already authenticated
            if (this.adminController.isAuthenticated()) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
            
            this.setupEventListeners();
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing admin interface:', error);
            this.showError('حدث خطأ في تحميل لوحة التحكم');
        }
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        this.loadDashboardData();
        this.updateSessionInfo();
    }

    async handleLogin(password) {
        try {
            const result = await this.adminController.authenticate(password);
            
            if (result.success) {
                this.showDashboard();
                this.hideLoginError();
            } else {
                this.showLoginError(result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('حدث خطأ في تسجيل الدخول');
        }
    }

    handleLogout() {
        this.adminController.logout();
        this.showLogin();
        this.clearForms();
    }

    async loadDashboardData() {
        try {
            const result = this.adminController.getDashboardData();
            
            if (result.success) {
                this.displayDashboardStats(result.data);
                this.displayTopStandings(result.data.standings);
                this.displayRecentActivities(result.data.recentActions);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('حدث خطأ في تحميل بيانات لوحة التحكم');
        }
    }

    displayDashboardStats(data) {
        document.getElementById('total-matches').textContent = data.matches.total;
        document.getElementById('played-matches').textContent = data.matches.played;
        document.getElementById('total-news').textContent = data.news.total;
        document.getElementById('total-teams').textContent = data.teams.total;
    }

    displayTopStandings(standings) {
        const container = document.getElementById('top-standings');
        if (!container || !standings) return;

        container.innerHTML = standings.map((team, index) => `
            <div class="standing-item">
                <span class="position">${index + 1}</span>
                <span class="team-name">${team.teamName}</span>
                <span class="points">${team.points} نقطة</span>
            </div>
        `).join('');
    }

    displayRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container || !activities) return;

        if (activities.length === 0) {
            container.innerHTML = '<p class="no-activities">لا توجد أنشطة حديثة</p>';
            return;
        }

        container.innerHTML = activities.map(activity => {
            const date = new Date(activity.timestamp).toLocaleString('ar-SA');
            return `
                <div class="activity-item">
                    <div class="activity-action">${this.getActionText(activity.action)}</div>
                    <div class="activity-time">${date}</div>
                </div>
            `;
        }).join('');
    }

    getActionText(action) {
        const actionMap = {
            'update_match_result': 'تحديث نتيجة مباراة',
            'update_match_status': 'تحديث حالة مباراة',
            'create_news_article': 'إضافة خبر جديد',
            'update_news_article': 'تحديث خبر',
            'delete_news_article': 'حذف خبر',
            'create_backup': 'إنشاء نسخة احتياطية',
            'restore_backup': 'استعادة نسخة احتياطية',
            'clear_logs': 'مسح سجل الأنشطة'
        };
        return actionMap[action] || action;
    }

    loadMatchesSection() {
        const fixtures = this.fixturesEngine.getAllFixtures();
        this.displayMatches(fixtures);
    }

    displayMatches(matches) {
        const container = document.getElementById('matches-container');
        if (!container) return;

        container.innerHTML = matches.map(match => `
            <div class="match-item">
                <div class="match-info">
                    <div class="match-teams">
                        <span class="home-team">${match.homeTeamInfo.name}</span>
                        <span class="vs">×</span>
                        <span class="away-team">${match.awayTeamInfo.name}</span>
                    </div>
                    <div class="match-details">
                        <span class="match-day">${match.dayName}</span>
                        <span class="match-time">${match.formattedTime}</span>
                        <span class="match-status ${match.status}">${match.statusText}</span>
                    </div>
                </div>
                <div class="match-result">
                    ${match.status === 'played' ? 
                        `<span class="score">${match.homeGoals} - ${match.awayGoals}</span>` :
                        '<span class="no-result">-</span>'
                    }
                </div>
                <div class="match-actions">
                    <button onclick="window.adminInterface.editMatch('${match.id}')" class="btn-edit">تحرير</button>
                </div>
            </div>
        `).join('');
    }

    editMatch(matchId) {
        const match = this.fixturesEngine.getAllFixtures().find(m => m.id === matchId);
        if (!match) return;

        this.currentMatchId = matchId;
        
        // Populate form
        document.getElementById('match-modal-title').textContent = 
            `تحرير مباراة ${match.homeTeamInfo.name} × ${match.awayTeamInfo.name}`;
        document.getElementById('home-goals').value = match.homeGoals || '';
        document.getElementById('away-goals').value = match.awayGoals || '';
        document.getElementById('match-status').value = match.status;
        document.getElementById('best-player').value = match.bestPlayer || '';
        document.getElementById('postponement-reason').value = match.postponementReason || '';

        // Show/hide postponement reason
        this.togglePostponementReason(match.status === 'postponed');

        // Show modal
        document.getElementById('match-modal').style.display = 'block';
    }

    async saveMatch() {
        if (!this.currentMatchId) return;

        try {
            const homeGoals = document.getElementById('home-goals').value;
            const awayGoals = document.getElementById('away-goals').value;
            const status = document.getElementById('match-status').value;
            const bestPlayer = document.getElementById('best-player').value;
            const postponementReason = document.getElementById('postponement-reason').value;

            // Update match result if goals are provided
            if (homeGoals !== '' && awayGoals !== '') {
                const resultData = {
                    homeGoals: parseInt(homeGoals),
                    awayGoals: parseInt(awayGoals),
                    bestPlayer: bestPlayer || null
                };

                const resultResult = this.adminController.updateMatchResult(this.currentMatchId, resultData);
                if (!resultResult.success) {
                    this.showError(resultResult.error);
                    return;
                }
            }

            // Update match status
            const statusResult = this.adminController.updateMatchStatus(
                this.currentMatchId, 
                status, 
                status === 'postponed' ? postponementReason : null
            );

            if (statusResult.success) {
                this.showSuccess('تم حفظ تغييرات المباراة بنجاح');
                this.closeModal();
                this.loadMatchesSection();
            } else {
                this.showError(statusResult.error);
            }

        } catch (error) {
            console.error('Error saving match:', error);
            this.showError('حدث خطأ في حفظ المباراة');
        }
    }

    loadNewsSection() {
        const articles = this.newsEngine.getAllArticles({ publishedOnly: false });
        this.displayNews(articles);
    }

    displayNews(articles) {
        const container = document.getElementById('news-container');
        if (!container) return;

        if (articles.length === 0) {
            container.innerHTML = '<p class="no-content">لا توجد أخبار</p>';
            return;
        }

        container.innerHTML = articles.map(article => {
            const publishDate = new Date(article.publishDate).toLocaleDateString('ar-SA');
            return `
                <div class="news-item">
                    <div class="news-info">
                        <h4 class="news-title">${article.title}</h4>
                        <div class="news-meta">
                            <span class="category ${article.category}">${this.newsEngine.getCategoryName(article.category)}</span>
                            <span class="author">بقلم: ${article.author}</span>
                            <span class="date">${publishDate}</span>
                            ${article.featured ? '<span class="featured-badge">مميز</span>' : ''}
                        </div>
                    </div>
                    <div class="news-stats">
                        <span class="views">${article.views || 0} مشاهدة</span>
                    </div>
                    <div class="news-actions">
                        <button onclick="window.adminInterface.editNews('${article.id}')" class="btn-edit">تحرير</button>
                        <button onclick="window.adminInterface.deleteNews('${article.id}')" class="btn-delete">حذف</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    addNews() {
        this.currentNewsId = null;
        this.clearNewsForm();
        document.getElementById('news-modal-title').textContent = 'إضافة خبر جديد';
        document.getElementById('news-modal').style.display = 'block';
    }

    editNews(articleId) {
        const article = this.newsEngine.getArticle(articleId);
        if (!article) return;

        this.currentNewsId = articleId;
        
        // Populate form
        document.getElementById('news-modal-title').textContent = 'تحرير الخبر';
        document.getElementById('news-title').value = article.title;
        document.getElementById('news-category').value = article.category;
        document.getElementById('news-author').value = article.author;
        document.getElementById('news-content').value = article.content;
        document.getElementById('news-tags').value = article.tags ? article.tags.join(', ') : '';
        document.getElementById('news-featured').checked = article.featured;

        // Show modal
        document.getElementById('news-modal').style.display = 'block';
    }

    async saveNews() {
        try {
            const title = document.getElementById('news-title').value.trim();
            const category = document.getElementById('news-category').value;
            const author = document.getElementById('news-author').value.trim();
            const content = document.getElementById('news-content').value.trim();
            const tagsText = document.getElementById('news-tags').value.trim();
            const featured = document.getElementById('news-featured').checked;

            if (!title || !content) {
                this.showError('العنوان والمحتوى مطلوبان');
                return;
            }

            const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            const articleData = {
                title,
                category,
                author: author || 'إدارة البطولة',
                content,
                tags,
                featured
            };

            let result;
            if (this.currentNewsId) {
                // Update existing article
                result = this.adminController.updateNewsArticle(this.currentNewsId, articleData);
            } else {
                // Create new article
                result = this.adminController.createNewsArticle(articleData);
            }

            if (result.success) {
                this.showSuccess(this.currentNewsId ? 'تم تحديث الخبر بنجاح' : 'تم إضافة الخبر بنجاح');
                this.closeModal();
                this.loadNewsSection();
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            console.error('Error saving news:', error);
            this.showError('حدث خطأ في حفظ الخبر');
        }
    }

    async deleteNews(articleId) {
        if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
            return;
        }

        try {
            const result = this.adminController.deleteNewsArticle(articleId);
            
            if (result.success) {
                this.showSuccess('تم حذف الخبر بنجاح');
                this.loadNewsSection();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error deleting news:', error);
            this.showError('حدث خطأ في حذف الخبر');
        }
    }

    async changePassword() {
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                this.showError('جميع الحقول مطلوبة');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showError('كلمة المرور الجديدة وتأكيدها غير متطابقتان');
                return;
            }

            const result = await this.adminController.changePassword(currentPassword, newPassword);
            
            if (result.success) {
                this.showSuccess(result.message);
                this.clearPasswordForm();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showError('حدث خطأ في تغيير كلمة المرور');
        }
    }

    loadSystemInfo() {
        const result = this.adminController.getSystemInfo();
        
        if (result.success) {
            const info = result.info;
            const container = document.getElementById('system-info');
            
            container.innerHTML = `
                <div class="info-item">
                    <label>إصدار النظام:</label>
                    <span>${info.version}</span>
                </div>
                <div class="info-item">
                    <label>مساحة التخزين المستخدمة:</label>
                    <span>${this.formatBytes(info.storage.totalSize)}</span>
                </div>
                <div class="info-item">
                    <label>معرف الجلسة:</label>
                    <span>${info.session.id}</span>
                </div>
                <div class="info-item">
                    <label>بداية الجلسة:</label>
                    <span>${new Date(info.session.startTime).toLocaleString('ar-SA')}</span>
                </div>
            `;
        }
    }

    async createBackup() {
        try {
            const result = this.adminController.getSystemBackup();
            
            if (result.success) {
                const backup = result.backup;
                const dataStr = JSON.stringify(backup, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `salfoon_backup_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                this.showSuccess('تم إنشاء النسخة الاحتياطية وتحميلها');
                this.updateBackupInfo();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showError('حدث خطأ في إنشاء النسخة الاحتياطية');
        }
    }

    async restoreBackup(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            const result = this.adminController.restoreSystemBackup(backupData);
            
            if (result.success) {
                this.showSuccess('تم استعادة النسخة الاحتياطية بنجاح');
                this.loadDashboardData();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.showError('حدث خطأ في استعادة النسخة الاحتياطية');
        }
    }

    updateBackupInfo() {
        const lastBackupTime = this.adminController.getLastBackupTime();
        const container = document.getElementById('backup-info-content');
        
        if (lastBackupTime) {
            const date = new Date(lastBackupTime).toLocaleString('ar-SA');
            container.innerHTML = `<p>آخر نسخة احتياطية: ${date}</p>`;
        } else {
            container.innerHTML = '<p>لم يتم إنشاء نسخة احتياطية بعد</p>';
        }
    }

    loadLogsSection() {
        const logs = this.adminController.getRecentAdminActions(50);
        this.displayLogs(logs);
    }

    displayLogs(logs) {
        const container = document.getElementById('logs-container');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = '<p class="no-content">لا توجد أنشطة مسجلة</p>';
            return;
        }

        container.innerHTML = logs.map(log => {
            const date = new Date(log.timestamp).toLocaleString('ar-SA');
            return `
                <div class="log-item">
                    <div class="log-action">${this.getActionText(log.action)}</div>
                    <div class="log-details">${JSON.stringify(log.details)}</div>
                    <div class="log-time">${date}</div>
                </div>
            `;
        }).join('');
    }

    async clearLogs() {
        if (!confirm('هل أنت متأكد من مسح سجل الأنشطة؟')) {
            return;
        }

        try {
            const result = this.adminController.clearAdminLogs();
            
            if (result.success) {
                this.showSuccess(result.message);
                this.loadLogsSection();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            this.showError('حدث خطأ في مسح السجل');
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            this.handleLogin(password);
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation menu
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // Match form
        document.getElementById('match-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMatch();
        });

        // Match status change
        document.getElementById('match-status')?.addEventListener('change', (e) => {
            this.togglePostponementReason(e.target.value === 'postponed');
        });

        // News form
        document.getElementById('news-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNews();
        });

        // Add news button
        document.getElementById('add-news-btn')?.addEventListener('click', () => {
            this.addNews();
        });

        // Password change form
        document.getElementById('change-password-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Backup buttons
        document.getElementById('create-backup-btn')?.addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('restore-backup-btn')?.addEventListener('click', () => {
            document.getElementById('backup-file-input').click();
        });

        document.getElementById('backup-file-input')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.restoreBackup(file);
            }
        });

        // Clear logs button
        document.getElementById('clear-logs-btn')?.addEventListener('click', () => {
            this.clearLogs();
        });

        // Refresh buttons
        document.getElementById('refresh-matches')?.addEventListener('click', () => {
            this.loadMatchesSection();
        });

        document.getElementById('refresh-news')?.addEventListener('click', () => {
            this.loadNewsSection();
        });

        document.getElementById('refresh-logs')?.addEventListener('click', () => {
            this.loadLogsSection();
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Filter controls
        document.getElementById('match-status-filter')?.addEventListener('change', (e) => {
            this.filterMatches(e.target.value);
        });

        document.getElementById('news-category-filter')?.addEventListener('change', (e) => {
            this.filterNews(e.target.value);
        });
    }

    switchSection(section) {
        // Update active menu item
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'matches':
                this.loadMatchesSection();
                break;
            case 'news':
                this.loadNewsSection();
                break;
            case 'settings':
                this.loadSystemInfo();
                break;
            case 'backup':
                this.updateBackupInfo();
                break;
            case 'logs':
                this.loadLogsSection();
                break;
        }
    }

    filterMatches(status) {
        let matches = this.fixturesEngine.getAllFixtures();
        if (status !== 'all') {
            matches = matches.filter(match => match.status === status);
        }
        this.displayMatches(matches);
    }

    filterNews(category) {
        let articles = this.newsEngine.getAllArticles({ publishedOnly: false });
        if (category !== 'all') {
            articles = articles.filter(article => article.category === category);
        }
        this.displayNews(articles);
    }

    togglePostponementReason(show) {
        const group = document.getElementById('postponement-group');
        if (group) {
            group.style.display = show ? 'block' : 'none';
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentMatchId = null;
        this.currentNewsId = null;
    }

    clearForms() {
        document.querySelectorAll('form').forEach(form => {
            form.reset();
        });
    }

    clearNewsForm() {
        document.getElementById('news-title').value = '';
        document.getElementById('news-category').value = 'announcement';
        document.getElementById('news-author').value = 'إدارة البطولة';
        document.getElementById('news-content').value = '';
        document.getElementById('news-tags').value = '';
        document.getElementById('news-featured').checked = false;
    }

    clearPasswordForm() {
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    updateSessionInfo() {
        const sessionInfo = document.getElementById('admin-session-info');
        if (sessionInfo) {
            const now = new Date().toLocaleTimeString('ar-SA');
            sessionInfo.textContent = `متصل - ${now}`;
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    hideLoginError() {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
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

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminInterface = new AdminInterface();
});