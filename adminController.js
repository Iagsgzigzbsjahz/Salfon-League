/**
 * Admin Panel Controller for Salfoon Ramadan League Platform
 * Handles authentication, admin operations, and security
 */

import LocalStorageManager from './storage.js';
import MatchEngine from './matchEngine.js';
import NewsEngine from './newsEngine.js';
import StandingsCalculator from './standingsEngine.js';

class AdminController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.matchEngine = new MatchEngine();
        this.newsEngine = new NewsEngine();
        this.standingsCalculator = new StandingsCalculator();
        
        // Default admin password (SHA-256 hash of "admin123")
        this.defaultPasswordHash = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
        this.sessionTimeout = 3600000; // 1 hour
        this.maxLoginAttempts = 3;
        this.lockoutDuration = 900000; // 15 minutes
        
        this.currentSession = null;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
    }

    /**
     * Initialize admin controller
     */
    async init() {
        try {
            await this.storage.initializeStorage();
            this.loadSessionState();
            this.setupSessionTimeout();
        } catch (error) {
            console.error('Error initializing admin controller:', error);
        }
    }

    /**
     * Authenticate admin user
     */
    async authenticate(password) {
        try {
            // Check if locked out
            if (this.isLockedOut()) {
                const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 60000);
                return {
                    success: false,
                    error: `تم قفل النظام. حاول مرة أخرى بعد ${remainingTime} دقيقة`
                };
            }

            if (!password) {
                return {
                    success: false,
                    error: 'كلمة المرور مطلوبة'
                };
            }

            // Hash the provided password
            const passwordHash = await this.hashPassword(password);
            
            // Get stored password hash
            const configData = this.storage.load(this.storage.keys.CONFIG);
            const storedHash = configData?.admin?.passwordHash || this.defaultPasswordHash;

            if (passwordHash === storedHash) {
                // Successful login
                this.loginAttempts = 0;
                this.lockoutUntil = null;
                
                // Create session
                this.currentSession = {
                    id: this.generateSessionId(),
                    startTime: Date.now(),
                    lastActivity: Date.now(),
                    authenticated: true
                };

                // Save session
                this.saveSessionState();

                return {
                    success: true,
                    sessionId: this.currentSession.id
                };
            } else {
                // Failed login
                this.loginAttempts++;
                
                if (this.loginAttempts >= this.maxLoginAttempts) {
                    this.lockoutUntil = Date.now() + this.lockoutDuration;
                    return {
                        success: false,
                        error: `كلمة مرور خاطئة. تم قفل النظام لمدة ${this.lockoutDuration / 60000} دقيقة`
                    };
                }

                const remainingAttempts = this.maxLoginAttempts - this.loginAttempts;
                return {
                    success: false,
                    error: `كلمة مرور خاطئة. المحاولات المتبقية: ${remainingAttempts}`
                };
            }

        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                error: 'حدث خطأ في المصادقة'
            };
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.currentSession || !this.currentSession.authenticated) {
            return false;
        }

        // Check session timeout
        const now = Date.now();
        if (now - this.currentSession.lastActivity > this.sessionTimeout) {
            this.logout();
            return false;
        }

        // Update last activity
        this.currentSession.lastActivity = now;
        this.saveSessionState();

        return true;
    }

    /**
     * Logout admin user
     */
    logout() {
        this.currentSession = null;
        this.storage.remove(this.storage.keys.ADMIN_SESSION);
    }

    /**
     * Change admin password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.isAuthenticated()) {
                return {
                    success: false,
                    error: 'غير مصرح بالوصول'
                };
            }

            if (!currentPassword || !newPassword) {
                return {
                    success: false,
                    error: 'كلمة المرور الحالية والجديدة مطلوبتان'
                };
            }

            if (newPassword.length < 6) {
                return {
                    success: false,
                    error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
                };
            }

            // Verify current password
            const authResult = await this.authenticate(currentPassword);
            if (!authResult.success) {
                return {
                    success: false,
                    error: 'كلمة المرور الحالية غير صحيحة'
                };
            }

            // Hash new password
            const newPasswordHash = await this.hashPassword(newPassword);

            // Update config
            const configData = this.storage.load(this.storage.keys.CONFIG) || {};
            if (!configData.admin) {
                configData.admin = {};
            }
            configData.admin.passwordHash = newPasswordHash;

            const saved = this.storage.save(this.storage.keys.CONFIG, configData);
            if (!saved) {
                return {
                    success: false,
                    error: 'فشل في حفظ كلمة المرور الجديدة'
                };
            }

            return {
                success: true,
                message: 'تم تغيير كلمة المرور بنجاح'
            };

        } catch (error) {
            console.error('Error changing password:', error);
            return {
                success: false,
                error: 'حدث خطأ في تغيير كلمة المرور'
            };
        }
    }

    /**
     * Update match result (admin operation)
     */
    updateMatchResult(matchId, resultData) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const result = this.matchEngine.updateResult(matchId, resultData);
            
            if (result.success) {
                // Recalculate standings
                this.standingsCalculator.updateStoredStatistics();
                
                // Log admin action
                this.logAdminAction('update_match_result', {
                    matchId,
                    resultData
                });
            }

            return result;
        } catch (error) {
            console.error('Error updating match result:', error);
            return {
                success: false,
                error: 'حدث خطأ في تحديث نتيجة المباراة'
            };
        }
    }

    /**
     * Update match status (admin operation)
     */
    updateMatchStatus(matchId, status, reason = null) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const result = this.matchEngine.setMatchStatus(matchId, status, reason);
            
            if (result.success) {
                // Log admin action
                this.logAdminAction('update_match_status', {
                    matchId,
                    status,
                    reason
                });
            }

            return result;
        } catch (error) {
            console.error('Error updating match status:', error);
            return {
                success: false,
                error: 'حدث خطأ في تحديث حالة المباراة'
            };
        }
    }

    /**
     * Create news article (admin operation)
     */
    createNewsArticle(articleData) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const result = this.newsEngine.createArticle(articleData);
            
            if (result.success) {
                // Log admin action
                this.logAdminAction('create_news_article', {
                    articleId: result.article.id,
                    title: result.article.title
                });
            }

            return result;
        } catch (error) {
            console.error('Error creating news article:', error);
            return {
                success: false,
                error: 'حدث خطأ في إنشاء المقال'
            };
        }
    }

    /**
     * Update news article (admin operation)
     */
    updateNewsArticle(articleId, updates) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const result = this.newsEngine.updateArticle(articleId, updates);
            
            if (result.success) {
                // Log admin action
                this.logAdminAction('update_news_article', {
                    articleId,
                    updates: Object.keys(updates)
                });
            }

            return result;
        } catch (error) {
            console.error('Error updating news article:', error);
            return {
                success: false,
                error: 'حدث خطأ في تحديث المقال'
            };
        }
    }

    /**
     * Delete news article (admin operation)
     */
    deleteNewsArticle(articleId) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const result = this.newsEngine.deleteArticle(articleId);
            
            if (result.success) {
                // Log admin action
                this.logAdminAction('delete_news_article', {
                    articleId,
                    title: result.deletedArticle.title
                });
            }

            return result;
        } catch (error) {
            console.error('Error deleting news article:', error);
            return {
                success: false,
                error: 'حدث خطأ في حذف المقال'
            };
        }
    }

    /**
     * Get admin dashboard data
     */
    getDashboardData() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            const newsData = this.storage.load(this.storage.keys.NEWS);
            const teamsData = this.storage.load(this.storage.keys.TEAMS);

            const playedMatches = matchesData?.matches.filter(m => m.status === 'played').length || 0;
            const scheduledMatches = matchesData?.matches.filter(m => m.status === 'scheduled').length || 0;
            const postponedMatches = matchesData?.matches.filter(m => m.status === 'postponed').length || 0;

            const publishedArticles = newsData?.articles.filter(a => a.published !== false).length || 0;
            const draftArticles = newsData?.articles.filter(a => a.published === false).length || 0;

            const standings = this.standingsCalculator.calculateStandings();

            return {
                success: true,
                data: {
                    matches: {
                        total: matchesData?.matches.length || 0,
                        played: playedMatches,
                        scheduled: scheduledMatches,
                        postponed: postponedMatches
                    },
                    news: {
                        total: newsData?.articles.length || 0,
                        published: publishedArticles,
                        drafts: draftArticles
                    },
                    teams: {
                        total: teamsData?.teams.length || 0
                    },
                    standings: standings.slice(0, 4), // Top 4
                    recentActions: this.getRecentAdminActions(10)
                }
            };

        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return {
                success: false,
                error: 'حدث خطأ في تحميل بيانات لوحة التحكم'
            };
        }
    }

    /**
     * Get system backup
     */
    getSystemBackup() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const backup = this.storage.backup();
            
            if (backup) {
                // Log admin action
                this.logAdminAction('create_backup', {
                    timestamp: backup.timestamp
                });

                return {
                    success: true,
                    backup: backup
                };
            } else {
                return {
                    success: false,
                    error: 'فشل في إنشاء النسخة الاحتياطية'
                };
            }

        } catch (error) {
            console.error('Error creating backup:', error);
            return {
                success: false,
                error: 'حدث خطأ في إنشاء النسخة الاحتياطية'
            };
        }
    }

    /**
     * Restore system from backup
     */
    restoreSystemBackup(backupData) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const restored = this.storage.restore(backupData);
            
            if (restored) {
                // Log admin action
                this.logAdminAction('restore_backup', {
                    timestamp: backupData.timestamp
                });

                return {
                    success: true,
                    message: 'تم استعادة النسخة الاحتياطية بنجاح'
                };
            } else {
                return {
                    success: false,
                    error: 'فشل في استعادة النسخة الاحتياطية'
                };
            }

        } catch (error) {
            console.error('Error restoring backup:', error);
            return {
                success: false,
                error: 'حدث خطأ في استعادة النسخة الاحتياطية'
            };
        }
    }

    /**
     * Hash password using SHA-256
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if system is locked out
     */
    isLockedOut() {
        return this.lockoutUntil && Date.now() < this.lockoutUntil;
    }

    /**
     * Load session state from storage
     */
    loadSessionState() {
        try {
            const sessionData = this.storage.load(this.storage.keys.ADMIN_SESSION);
            if (sessionData) {
                this.currentSession = sessionData.session;
                this.loginAttempts = sessionData.loginAttempts || 0;
                this.lockoutUntil = sessionData.lockoutUntil || null;
            }
        } catch (error) {
            console.error('Error loading session state:', error);
        }
    }

    /**
     * Save session state to storage
     */
    saveSessionState() {
        try {
            const sessionData = {
                session: this.currentSession,
                loginAttempts: this.loginAttempts,
                lockoutUntil: this.lockoutUntil,
                lastSaved: Date.now()
            };
            this.storage.save(this.storage.keys.ADMIN_SESSION, sessionData);
        } catch (error) {
            console.error('Error saving session state:', error);
        }
    }

    /**
     * Setup session timeout monitoring
     */
    setupSessionTimeout() {
        setInterval(() => {
            if (this.currentSession && this.currentSession.authenticated) {
                const now = Date.now();
                if (now - this.currentSession.lastActivity > this.sessionTimeout) {
                    this.logout();
                }
            }
        }, 60000); // Check every minute
    }

    /**
     * Log admin action
     */
    logAdminAction(action, details = {}) {
        try {
            const logEntry = {
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                action: action,
                details: details,
                timestamp: new Date().toISOString(),
                sessionId: this.currentSession?.id
            };

            // Get existing logs
            let adminLogs = this.storage.load('salfoon_admin_logs') || [];
            
            // Add new log entry
            adminLogs.unshift(logEntry);
            
            // Keep only last 100 entries
            if (adminLogs.length > 100) {
                adminLogs = adminLogs.slice(0, 100);
            }

            // Save logs
            this.storage.save('salfoon_admin_logs', adminLogs);

        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    /**
     * Get recent admin actions
     */
    getRecentAdminActions(limit = 10) {
        try {
            const adminLogs = this.storage.load('salfoon_admin_logs') || [];
            return adminLogs.slice(0, limit);
        } catch (error) {
            console.error('Error getting recent admin actions:', error);
            return [];
        }
    }

    /**
     * Clear admin logs
     */
    clearAdminLogs() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            this.storage.remove('salfoon_admin_logs');
            this.logAdminAction('clear_logs');
            
            return {
                success: true,
                message: 'تم مسح سجل الأنشطة'
            };
        } catch (error) {
            console.error('Error clearing admin logs:', error);
            return {
                success: false,
                error: 'حدث خطأ في مسح السجل'
            };
        }
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'غير مصرح بالوصول'
            };
        }

        try {
            const storageInfo = this.storage.getStorageInfo();
            
            return {
                success: true,
                info: {
                    storage: storageInfo,
                    session: {
                        id: this.currentSession?.id,
                        startTime: this.currentSession?.startTime,
                        lastActivity: this.currentSession?.lastActivity
                    },
                    version: '1.0.0',
                    lastBackup: this.getLastBackupTime()
                }
            };
        } catch (error) {
            console.error('Error getting system info:', error);
            return {
                success: false,
                error: 'حدث خطأ في تحميل معلومات النظام'
            };
        }
    }

    /**
     * Get last backup time
     */
    getLastBackupTime() {
        try {
            const adminLogs = this.storage.load('salfoon_admin_logs') || [];
            const backupLog = adminLogs.find(log => log.action === 'create_backup');
            return backupLog ? backupLog.timestamp : null;
        } catch (error) {
            return null;
        }
    }
}

export default AdminController;