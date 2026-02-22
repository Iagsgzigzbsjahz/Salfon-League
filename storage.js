/**
 * LocalStorage Manager for Salfoon Ramadan League Platform
 * Handles all data persistence operations using browser LocalStorage
 */

class LocalStorageManager {
    constructor() {
        this.keys = {
            TEAMS: 'salfoon_teams',
            MATCHES: 'salfoon_matches',
            NEWS: 'salfoon_news',
            CONFIG: 'salfoon_config',
            USER_PREFERENCES: 'salfoon_preferences',
            ADMIN_SESSION: 'salfoon_admin_session',
            CACHE_METADATA: 'salfoon_cache_metadata'
        };
        
        this.initializeStorage();
    }

    /**
     * Initialize storage with default data if not exists
     */
    async initializeStorage() {
        try {
            // Load initial data from JSON files if storage is empty
            if (!this.exists(this.keys.TEAMS)) {
                const teamsData = await this.loadFromFile('teams.json');
                this.save(this.keys.TEAMS, teamsData);
            }

            if (!this.exists(this.keys.MATCHES)) {
                const matchesData = await this.loadFromFile('matches.json');
                this.save(this.keys.MATCHES, matchesData);
            }

            if (!this.exists(this.keys.NEWS)) {
                const newsData = await this.loadFromFile('news.json');
                this.save(this.keys.NEWS, newsData);
            }

            if (!this.exists(this.keys.CONFIG)) {
                const configData = await this.loadFromFile('config.json');
                this.save(this.keys.CONFIG, configData);
            }

            // Initialize user preferences
            if (!this.exists(this.keys.USER_PREFERENCES)) {
                this.save(this.keys.USER_PREFERENCES, {
                    darkMode: false,
                    language: 'ar',
                    notifications: true
                });
            }

            // Update cache metadata
            this.updateCacheMetadata();
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    /**
     * Load data from JSON file
     */
    async loadFromFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Save data to localStorage
     */
    save(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(key, serializedData);
            this.updateCacheMetadata(key);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
            return false;
        }
    }

    /**
     * Load data from localStorage
     */
    load(key) {
        try {
            const serializedData = localStorage.getItem(key);
            if (serializedData === null) {
                return null;
            }
            return JSON.parse(serializedData);
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.handleDataCorruption(key);
            return null;
        }
    }

    /**
     * Remove data from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            this.updateCacheMetadata(key, true);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    /**
     * Check if key exists in localStorage
     */
    exists(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Validate data integrity
     */
    validateIntegrity(key) {
        try {
            const data = this.load(key);
            if (data === null) {
                return false;
            }

            // Basic validation based on key type
            switch (key) {
                case this.keys.TEAMS:
                    return data.teams && Array.isArray(data.teams);
                case this.keys.MATCHES:
                    return data.matches && Array.isArray(data.matches);
                case this.keys.NEWS:
                    return data.articles && Array.isArray(data.articles);
                case this.keys.CONFIG:
                    return data.tournament && typeof data.tournament === 'object';
                default:
                    return true;
            }
        } catch (error) {
            console.error('Error validating data integrity:', error);
            return false;
        }
    }

    /**
     * Create backup of all data
     */
    backup() {
        try {
            const backup = {};
            Object.values(this.keys).forEach(key => {
                const data = this.load(key);
                if (data !== null) {
                    backup[key] = data;
                }
            });
            
            backup.timestamp = new Date().toISOString();
            return backup;
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    }

    /**
     * Restore data from backup
     */
    restore(backupData) {
        try {
            if (!backupData || typeof backupData !== 'object') {
                throw new Error('Invalid backup data');
            }

            Object.entries(backupData).forEach(([key, data]) => {
                if (key !== 'timestamp' && Object.values(this.keys).includes(key)) {
                    this.save(key, data);
                }
            });

            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            return false;
        }
    }

    /**
     * Handle storage quota exceeded error
     */
    handleStorageQuotaExceeded() {
        console.warn('LocalStorage quota exceeded. Attempting cleanup...');
        
        // Remove old cache metadata
        const metadata = this.load(this.keys.CACHE_METADATA) || {};
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

        Object.entries(metadata).forEach(([key, timestamp]) => {
            if (timestamp < oneWeekAgo && key !== this.keys.CONFIG) {
                this.remove(key);
            }
        });

        // Compress news data (keep only recent articles)
        const newsData = this.load(this.keys.NEWS);
        if (newsData && newsData.articles) {
            const recentArticles = newsData.articles
                .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
                .slice(0, 20); // Keep only 20 most recent articles
            
            this.save(this.keys.NEWS, { articles: recentArticles });
        }
    }

    /**
     * Handle data corruption
     */
    handleDataCorruption(key) {
        console.error(`Data corruption detected for key: ${key}`);
        
        // Try to restore from initial data files
        this.initializeStorage().then(() => {
            console.log(`Attempted to restore ${key} from initial data`);
        });
    }

    /**
     * Update cache metadata
     */
    updateCacheMetadata(key = null, removed = false) {
        try {
            let metadata = this.load(this.keys.CACHE_METADATA) || {};
            
            if (key) {
                if (removed) {
                    delete metadata[key];
                } else {
                    metadata[key] = Date.now();
                }
            } else {
                // Update all keys
                Object.values(this.keys).forEach(k => {
                    if (k !== this.keys.CACHE_METADATA && this.exists(k)) {
                        metadata[k] = Date.now();
                    }
                });
            }

            localStorage.setItem(this.keys.CACHE_METADATA, JSON.stringify(metadata));
        } catch (error) {
            console.error('Error updating cache metadata:', error);
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            const keysSizes = {};

            Object.values(this.keys).forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    const size = new Blob([data]).size;
                    keysSizes[key] = size;
                    totalSize += size;
                }
            });

            return {
                totalSize,
                keysSizes,
                available: this.getAvailableStorage()
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    /**
     * Estimate available storage space
     */
    getAvailableStorage() {
        try {
            const testKey = 'storage_test';
            const testData = 'x'.repeat(1024); // 1KB test data
            let available = 0;

            while (available < 10240) { // Test up to 10MB
                try {
                    localStorage.setItem(testKey, testData.repeat(available + 1));
                    available++;
                } catch (e) {
                    break;
                }
            }

            localStorage.removeItem(testKey);
            return available * 1024; // Return in bytes
        } catch (error) {
            console.error('Error estimating available storage:', error);
            return 0;
        }
    }

    /**
     * Clear all tournament data (for reset functionality)
     */
    clearAllData() {
        try {
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }
}

// Export for use in other modules
export default LocalStorageManager;