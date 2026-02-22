/**
 * News Engine for Salfoon Ramadan League Platform
 * Handles news article CRUD operations, categorization, and display
 */

import LocalStorageManager from 'storage.js';

class NewsEngine {
    constructor() {
        this.storage = new LocalStorageManager();
        this.categories = {
            'announcement': 'إعلانات',
            'match_report': 'تقارير المباريات',
            'general': 'أخبار عامة'
        };
    }

    /**
     * Create a new news article
     */
    createArticle(articleData) {
        try {
            // Validate article data
            const validation = this.validateArticleData(articleData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                throw new Error('Failed to load news data');
            }

            // Generate unique ID
            const articleId = this.generateArticleId();

            // Create new article
            const newArticle = {
                id: articleId,
                title: articleData.title,
                content: articleData.content,
                category: articleData.category || 'general',
                author: articleData.author || 'إدارة البطولة',
                publishDate: articleData.publishDate || new Date().toISOString(),
                lastModified: new Date().toISOString(),
                featured: articleData.featured || false,
                matchId: articleData.matchId || null,
                tags: articleData.tags || [],
                imageUrl: articleData.imageUrl || null,
                summary: articleData.summary || this.generateSummary(articleData.content),
                views: 0,
                published: articleData.published !== false // Default to true
            };

            // Add to articles array
            newsData.articles.push(newArticle);

            // Sort articles by publish date (newest first)
            newsData.articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

            // Save to storage
            const saved = this.storage.save(this.storage.keys.NEWS, newsData);
            if (!saved) {
                throw new Error('Failed to save article');
            }

            return {
                success: true,
                article: newArticle
            };

        } catch (error) {
            console.error('Error creating article:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update an existing article
     */
    updateArticle(articleId, updates) {
        try {
            if (!articleId || !updates) {
                throw new Error('Article ID and updates are required');
            }

            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                throw new Error('Failed to load news data');
            }

            const articleIndex = newsData.articles.findIndex(article => article.id === articleId);
            if (articleIndex === -1) {
                throw new Error(`Article with ID ${articleId} not found`);
            }

            const article = newsData.articles[articleIndex];

            // Update allowed fields
            const allowedFields = ['title', 'content', 'category', 'author', 'featured', 'matchId', 'tags', 'imageUrl', 'summary', 'published'];
            
            allowedFields.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    article[field] = updates[field];
                }
            });

            // Update summary if content changed
            if (updates.content && !updates.summary) {
                article.summary = this.generateSummary(updates.content);
            }

            // Update last modified timestamp
            article.lastModified = new Date().toISOString();

            // Validate updated article
            const validation = this.validateArticleData(article);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Save to storage
            const saved = this.storage.save(this.storage.keys.NEWS, newsData);
            if (!saved) {
                throw new Error('Failed to save updated article');
            }

            return {
                success: true,
                article: article
            };

        } catch (error) {
            console.error('Error updating article:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete an article
     */
    deleteArticle(articleId) {
        try {
            if (!articleId) {
                throw new Error('Article ID is required');
            }

            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                throw new Error('Failed to load news data');
            }

            const articleIndex = newsData.articles.findIndex(article => article.id === articleId);
            if (articleIndex === -1) {
                throw new Error(`Article with ID ${articleId} not found`);
            }

            // Remove article
            const deletedArticle = newsData.articles.splice(articleIndex, 1)[0];

            // Save to storage
            const saved = this.storage.save(this.storage.keys.NEWS, newsData);
            if (!saved) {
                throw new Error('Failed to save after article deletion');
            }

            return {
                success: true,
                deletedArticle: deletedArticle
            };

        } catch (error) {
            console.error('Error deleting article:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get article by ID
     */
    getArticle(articleId) {
        try {
            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                return null;
            }

            const article = newsData.articles.find(article => article.id === articleId);
            
            // Increment view count
            if (article) {
                article.views = (article.views || 0) + 1;
                this.storage.save(this.storage.keys.NEWS, newsData);
            }

            return article || null;
        } catch (error) {
            console.error('Error getting article:', error);
            return null;
        }
    }

    /**
     * Get all articles with optional filtering
     */
    getAllArticles(options = {}) {
        try {
            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                return [];
            }

            let articles = [...newsData.articles];

            // Filter by published status
            if (options.publishedOnly !== false) {
                articles = articles.filter(article => article.published !== false);
            }

            // Filter by category
            if (options.category) {
                articles = articles.filter(article => article.category === options.category);
            }

            // Filter by featured
            if (options.featured !== undefined) {
                articles = articles.filter(article => article.featured === options.featured);
            }

            // Filter by match ID
            if (options.matchId) {
                articles = articles.filter(article => article.matchId === options.matchId);
            }

            // Filter by tags
            if (options.tags && options.tags.length > 0) {
                articles = articles.filter(article => 
                    article.tags && article.tags.some(tag => options.tags.includes(tag))
                );
            }

            // Search in title and content
            if (options.search) {
                const searchTerm = options.search.toLowerCase();
                articles = articles.filter(article => 
                    article.title.toLowerCase().includes(searchTerm) ||
                    article.content.toLowerCase().includes(searchTerm) ||
                    (article.summary && article.summary.toLowerCase().includes(searchTerm))
                );
            }

            // Limit results
            if (options.limit && options.limit > 0) {
                articles = articles.slice(0, options.limit);
            }

            // Sort by date (newest first by default)
            articles.sort((a, b) => {
                const dateA = new Date(a.publishDate);
                const dateB = new Date(b.publishDate);
                return options.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });

            return articles;

        } catch (error) {
            console.error('Error getting all articles:', error);
            return [];
        }
    }

    /**
     * Get articles by category
     */
    getArticlesByCategory(category) {
        return this.getAllArticles({ category });
    }

    /**
     * Get featured articles
     */
    getFeaturedArticles(limit = 5) {
        return this.getAllArticles({ featured: true, limit });
    }

    /**
     * Get recent articles
     */
    getRecentArticles(limit = 10) {
        return this.getAllArticles({ limit });
    }

    /**
     * Get match reports
     */
    getMatchReports(limit = null) {
        return this.getAllArticles({ category: 'match_report', limit });
    }

    /**
     * Get articles related to a specific match
     */
    getMatchArticles(matchId) {
        return this.getAllArticles({ matchId });
    }

    /**
     * Search articles
     */
    searchArticles(searchTerm, options = {}) {
        return this.getAllArticles({ 
            search: searchTerm,
            ...options
        });
    }

    /**
     * Get article statistics
     */
    getArticleStatistics() {
        try {
            const articles = this.getAllArticles({ publishedOnly: false });
            
            const stats = {
                total: articles.length,
                published: articles.filter(a => a.published !== false).length,
                drafts: articles.filter(a => a.published === false).length,
                featured: articles.filter(a => a.featured).length,
                byCategory: {},
                totalViews: 0,
                mostViewed: null,
                recentCount: 0
            };

            // Count by category
            Object.keys(this.categories).forEach(category => {
                stats.byCategory[category] = articles.filter(a => a.category === category).length;
            });

            // Calculate total views and find most viewed
            let maxViews = 0;
            articles.forEach(article => {
                const views = article.views || 0;
                stats.totalViews += views;
                
                if (views > maxViews) {
                    maxViews = views;
                    stats.mostViewed = article;
                }
            });

            // Count recent articles (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            stats.recentCount = articles.filter(article => 
                new Date(article.publishDate) > weekAgo
            ).length;

            return stats;

        } catch (error) {
            console.error('Error getting article statistics:', error);
            return null;
        }
    }

    /**
     * Validate article data
     */
    validateArticleData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return { valid: false, error: 'Invalid article data' };
            }

            // Required fields
            if (!data.title || data.title.trim() === '') {
                return { valid: false, error: 'Article title is required' };
            }

            if (!data.content || data.content.trim() === '') {
                return { valid: false, error: 'Article content is required' };
            }

            // Validate category
            if (data.category && !Object.keys(this.categories).includes(data.category)) {
                return { valid: false, error: 'Invalid article category' };
            }

            // Validate title length
            if (data.title.length > 200) {
                return { valid: false, error: 'Article title is too long (max 200 characters)' };
            }

            // Validate content length
            if (data.content.length > 10000) {
                return { valid: false, error: 'Article content is too long (max 10000 characters)' };
            }

            // Validate tags
            if (data.tags && (!Array.isArray(data.tags) || data.tags.length > 10)) {
                return { valid: false, error: 'Invalid tags (max 10 tags allowed)' };
            }

            // Validate match ID if provided
            if (data.matchId) {
                const matchesData = this.storage.load(this.storage.keys.MATCHES);
                if (matchesData) {
                    const matchExists = matchesData.matches.some(match => match.id === data.matchId);
                    if (!matchExists) {
                        return { valid: false, error: 'Referenced match does not exist' };
                    }
                }
            }

            return { valid: true };

        } catch (error) {
            console.error('Error validating article data:', error);
            return { valid: false, error: 'Validation error occurred' };
        }
    }

    /**
     * Generate unique article ID
     */
    generateArticleId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `news-${timestamp}-${random}`;
    }

    /**
     * Generate article summary from content
     */
    generateSummary(content, maxLength = 150) {
        if (!content) return '';
        
        // Remove HTML tags
        const textContent = content.replace(/<[^>]*>/g, '');
        
        // Truncate to max length
        if (textContent.length <= maxLength) {
            return textContent;
        }
        
        // Find last complete word within limit
        const truncated = textContent.substr(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        return lastSpace > 0 ? truncated.substr(0, lastSpace) + '...' : truncated + '...';
    }

    /**
     * Get category display name
     */
    getCategoryName(category) {
        return this.categories[category] || category;
    }

    /**
     * Get all available categories
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Create match report template
     */
    createMatchReportTemplate(matchId) {
        try {
            const matchesData = this.storage.load(this.storage.keys.MATCHES);
            const teamsData = this.storage.load(this.storage.keys.TEAMS);
            
            if (!matchesData || !teamsData) {
                throw new Error('Failed to load required data');
            }

            const match = matchesData.matches.find(m => m.id === matchId);
            if (!match) {
                throw new Error('Match not found');
            }

            const homeTeam = teamsData.teams.find(t => t.id === match.homeTeam);
            const awayTeam = teamsData.teams.find(t => t.id === match.awayTeam);

            if (!homeTeam || !awayTeam) {
                throw new Error('Team data not found');
            }

            const title = `تقرير مباراة ${homeTeam.name} × ${awayTeam.name}`;
            
            let content = `<h2>تقرير مباراة ${homeTeam.name} × ${awayTeam.name}</h2>`;
            content += `<p><strong>التاريخ:</strong> ${match.dayName}</p>`;
            content += `<p><strong>الوقت:</strong> ${match.scheduledTime}</p>`;
            
            if (match.status === 'played' && match.homeGoals !== null && match.awayGoals !== null) {
                content += `<p><strong>النتيجة:</strong> ${homeTeam.name} ${match.homeGoals} - ${match.awayGoals} ${awayTeam.name}</p>`;
                
                if (match.bestPlayer) {
                    content += `<p><strong>أفضل لاعب:</strong> ${match.bestPlayer}</p>`;
                }
                
                content += `<h3>ملخص المباراة</h3>`;
                content += `<p>[أضف ملخص المباراة هنا]</p>`;
                
                content += `<h3>الأهداف</h3>`;
                content += `<p>[أضف تفاصيل الأهداف هنا]</p>`;
                
                content += `<h3>الأحداث المهمة</h3>`;
                content += `<p>[أضف الأحداث المهمة هنا]</p>`;
            } else {
                content += `<p>المباراة لم تُلعب بعد أو تم تأجيلها.</p>`;
            }

            return {
                title,
                content,
                category: 'match_report',
                matchId: matchId,
                tags: [homeTeam.shortName, awayTeam.shortName, 'تقرير مباراة']
            };

        } catch (error) {
            console.error('Error creating match report template:', error);
            return null;
        }
    }

    /**
     * Bulk operations
     */
    bulkUpdateArticles(articleIds, updates) {
        try {
            const results = [];
            
            articleIds.forEach(id => {
                const result = this.updateArticle(id, updates);
                results.push({ id, ...result });
            });

            return {
                success: true,
                results
            };

        } catch (error) {
            console.error('Error in bulk update:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export articles
     */
    exportArticles(format = 'json') {
        try {
            const articles = this.getAllArticles({ publishedOnly: false });
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(articles, null, 2);
                
                case 'csv':
                    return this.exportToCSV(articles);
                
                default:
                    throw new Error('Unsupported export format');
            }
        } catch (error) {
            console.error('Error exporting articles:', error);
            return null;
        }
    }

    /**
     * Export articles to CSV
     */
    exportToCSV(articles) {
        const headers = ['ID', 'العنوان', 'الفئة', 'الكاتب', 'تاريخ النشر', 'مميز', 'المشاهدات'];
        const rows = articles.map(article => [
            article.id,
            article.title,
            this.getCategoryName(article.category),
            article.author,
            new Date(article.publishDate).toLocaleDateString('ar-SA'),
            article.featured ? 'نعم' : 'لا',
            article.views || 0
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Clean up old articles (admin function)
     */
    cleanupOldArticles(daysOld = 365) {
        try {
            const newsData = this.storage.load(this.storage.keys.NEWS);
            if (!newsData) {
                throw new Error('Failed to load news data');
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const initialCount = newsData.articles.length;
            
            // Keep featured articles and recent articles
            newsData.articles = newsData.articles.filter(article => 
                article.featured || 
                new Date(article.publishDate) > cutoffDate ||
                article.category === 'announcement' // Keep all announcements
            );

            const removedCount = initialCount - newsData.articles.length;

            if (removedCount > 0) {
                const saved = this.storage.save(this.storage.keys.NEWS, newsData);
                if (!saved) {
                    throw new Error('Failed to save after cleanup');
                }
            }

            return {
                success: true,
                removedCount
            };

        } catch (error) {
            console.error('Error cleaning up old articles:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default NewsEngine;