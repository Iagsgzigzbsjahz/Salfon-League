/**
 * News Page Controller for Salfoon Ramadan League Platform
 * Handles news display, filtering, and user interactions
 */

import LocalStorageManager from './storage.js';
import NewsEngine from './newsEngine.js';

class NewsController {
    constructor() {
        this.storage = new LocalStorageManager();
        this.newsEngine = new NewsEngine();
        this.currentPage = 1;
        this.articlesPerPage = 6;
        this.currentFilters = {
            category: 'all',
            search: ''
        };
        this.currentSort = 'date-desc';
        this.allArticles = [];
        this.filteredArticles = [];
        
        this.init();
    }

    async init() {
        try {
            // Wait for storage initialization
            await this.storage.initializeStorage();
            
            // Load news and populate page
            this.loadNews();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing news controller:', error);
            this.showError('حدث خطأ في تحميل البيانات');
        }
    }

    loadNews() {
        try {
            // Get all articles
            this.allArticles = this.newsEngine.getAllArticles();
            this.filteredArticles = [...this.allArticles];
            
            // Get news statistics
            const newsStats = this.newsEngine.getArticleStatistics();
            
            // Display featured news
            this.displayFeaturedNews();
            
            // Display news statistics
            this.displayNewsStatistics(newsStats);
            
            // Display category counts
            this.displayCategoryCounts(newsStats);
            
            // Display news list
            this.displayNewsList();
            
            // Display most viewed articles
            this.displayMostViewed();
            
            // Display recent match reports
            this.displayRecentReports();
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.showError('حدث خطأ في تحميل الأخبار');
        }
    }

    displayFeaturedNews() {
        const featuredArticles = this.newsEngine.getFeaturedArticles(3);
        const container = document.getElementById('featured-news-container');
        const section = document.getElementById('featured-section');
        
        if (!container || !section) return;

        if (featuredArticles.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = featuredArticles.map(article => this.createFeaturedArticleCard(article)).join('');
    }

    createFeaturedArticleCard(article) {
        const publishDate = new Date(article.publishDate).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="featured-article" onclick="window.newsController.showArticle('${article.id}')">
                ${article.imageUrl ? `
                    <div class="featured-image">
                        <img src="${article.imageUrl}" alt="${article.title}" onerror="this.style.display='none'">
                    </div>
                ` : ''}
                <div class="featured-content">
                    <div class="article-meta">
                        <span class="category ${article.category}">${this.newsEngine.getCategoryName(article.category)}</span>
                        <span class="publish-date">${publishDate}</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-summary">${article.summary || this.newsEngine.generateSummary(article.content)}</p>
                    <div class="article-footer">
                        <span class="author">بقلم: ${article.author}</span>
                        <span class="views">${article.views || 0} مشاهدة</span>
                    </div>
                </div>
            </div>
        `;
    }

    displayNewsStatistics(stats) {
        if (!stats) return;

        document.getElementById('total-articles').textContent = stats.published;
        document.getElementById('recent-articles').textContent = stats.recentCount;
        document.getElementById('match-reports').textContent = stats.byCategory.match_report || 0;
        document.getElementById('total-views').textContent = stats.totalViews;
    }

    displayCategoryCounts(stats) {
        if (!stats) return;

        document.getElementById('announcements-count').textContent = stats.byCategory.announcement || 0;
        document.getElementById('reports-count').textContent = stats.byCategory.match_report || 0;
        document.getElementById('general-count').textContent = stats.byCategory.general || 0;
    }

    displayNewsList() {
        const container = document.getElementById('news-container');
        const noResults = document.getElementById('no-results');
        const loadMoreSection = document.getElementById('load-more-section');
        
        if (!container) return;

        // Apply filters and sorting
        this.applyFiltersAndSort();

        if (this.filteredArticles.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            loadMoreSection.style.display = 'none';
            return;
        }

        noResults.style.display = 'none';

        // Get articles for current page
        const startIndex = 0;
        const endIndex = this.currentPage * this.articlesPerPage;
        const articlesToShow = this.filteredArticles.slice(startIndex, endIndex);

        container.innerHTML = articlesToShow.map(article => this.createArticleCard(article)).join('');

        // Show/hide load more button
        if (endIndex >= this.filteredArticles.length) {
            loadMoreSection.style.display = 'none';
        } else {
            loadMoreSection.style.display = 'block';
        }
    }

    createArticleCard(article) {
        const publishDate = new Date(article.publishDate).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="article-card" onclick="window.newsController.showArticle('${article.id}')">
                ${article.imageUrl ? `
                    <div class="article-image">
                        <img src="${article.imageUrl}" alt="${article.title}" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="article-content">
                    <div class="article-meta">
                        <span class="category ${article.category}">${this.newsEngine.getCategoryName(article.category)}</span>
                        <span class="publish-date">${publishDate}</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-summary">${article.summary || this.newsEngine.generateSummary(article.content)}</p>
                    <div class="article-footer">
                        <span class="author">بقلم: ${article.author}</span>
                        <div class="article-stats">
                            <span class="views">👁 ${article.views || 0}</span>
                            ${article.tags && article.tags.length > 0 ? `
                                <div class="article-tags">
                                    ${article.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    displayMostViewed() {
        const articles = this.allArticles
            .filter(article => (article.views || 0) > 0)
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5);

        const container = document.getElementById('most-viewed-container');
        if (!container) return;

        if (articles.length === 0) {
            container.innerHTML = '<p class="no-content">لا توجد مقالات مشاهدة بعد</p>';
            return;
        }

        container.innerHTML = articles.map((article, index) => `
            <div class="most-viewed-item" onclick="window.newsController.showArticle('${article.id}')">
                <span class="rank">${index + 1}</span>
                <div class="item-content">
                    <h4 class="item-title">${article.title}</h4>
                    <div class="item-meta">
                        <span class="category">${this.newsEngine.getCategoryName(article.category)}</span>
                        <span class="views">${article.views} مشاهدة</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayRecentReports() {
        const reports = this.newsEngine.getMatchReports(3);
        const container = document.getElementById('recent-reports-container');
        const section = document.getElementById('recent-reports-section');
        
        if (!container || !section) return;

        if (reports.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = reports.map(report => this.createReportCard(report)).join('');
    }

    createReportCard(report) {
        const publishDate = new Date(report.publishDate).toLocaleDateString('ar-SA', {
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="report-card" onclick="window.newsController.showArticle('${report.id}')">
                <div class="report-content">
                    <h4 class="report-title">${report.title}</h4>
                    <p class="report-summary">${report.summary || this.newsEngine.generateSummary(report.content, 100)}</p>
                    <div class="report-meta">
                        <span class="publish-date">${publishDate}</span>
                        <span class="views">${report.views || 0} مشاهدة</span>
                    </div>
                </div>
            </div>
        `;
    }

    applyFiltersAndSort() {
        // Start with all articles
        this.filteredArticles = [...this.allArticles];

        // Apply category filter
        if (this.currentFilters.category !== 'all') {
            this.filteredArticles = this.filteredArticles.filter(article => 
                article.category === this.currentFilters.category
            );
        }

        // Apply search filter
        if (this.currentFilters.search) {
            this.filteredArticles = this.newsEngine.searchArticles(
                this.currentFilters.search,
                { category: this.currentFilters.category !== 'all' ? this.currentFilters.category : undefined }
            );
        }

        // Apply sorting
        this.applySorting();
    }

    applySorting() {
        switch (this.currentSort) {
            case 'date-desc':
                this.filteredArticles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
                break;
            case 'date-asc':
                this.filteredArticles.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
                break;
            case 'views-desc':
                this.filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'title-asc':
                this.filteredArticles.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
                break;
        }
    }

    setupEventListeners() {
        // Category filter
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.currentPage = 1;
            this.displayNewsList();
        });

        // Search
        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        document.getElementById('clear-search')?.addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.currentFilters.search = '';
            this.currentPage = 1;
            this.displayNewsList();
        });

        // Sort
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.currentPage = 1;
            this.displayNewsList();
        });

        // Load more
        document.getElementById('load-more-btn')?.addEventListener('click', () => {
            this.loadMore();
        });

        // Category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                document.getElementById('category-filter').value = category;
                this.currentFilters.category = category;
                this.currentPage = 1;
                this.displayNewsList();
                
                // Scroll to news list
                document.querySelector('.news-list').scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Modal controls
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('article-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'article-modal') {
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

    performSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            this.currentFilters.search = searchInput.value.trim();
            this.currentPage = 1;
            this.displayNewsList();
        }
    }

    loadMore() {
        this.currentPage++;
        this.displayNewsList();
    }

    showArticle(articleId) {
        const article = this.newsEngine.getArticle(articleId);
        if (!article) return;

        const modal = document.getElementById('article-modal');
        const modalBody = document.getElementById('article-modal-body');

        if (!modal || !modalBody) return;

        const publishDate = new Date(article.publishDate).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        modalBody.innerHTML = `
            <article class="full-article">
                <header class="article-header">
                    <div class="article-meta">
                        <span class="category ${article.category}">${this.newsEngine.getCategoryName(article.category)}</span>
                        <span class="publish-date">${publishDate}</span>
                    </div>
                    <h1 class="article-title">${article.title}</h1>
                    <div class="article-info">
                        <span class="author">بقلم: ${article.author}</span>
                        <span class="views">👁 ${article.views || 0} مشاهدة</span>
                    </div>
                    ${article.tags && article.tags.length > 0 ? `
                        <div class="article-tags">
                            ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </header>
                
                ${article.imageUrl ? `
                    <div class="article-main-image">
                        <img src="${article.imageUrl}" alt="${article.title}" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                
                <div class="article-content">
                    ${article.content}
                </div>
                
                <footer class="article-footer">
                    <div class="article-actions">
                        <button onclick="window.newsController.shareArticle('${article.id}')" class="share-btn">مشاركة</button>
                    </div>
                    <div class="article-meta-footer">
                        <span>آخر تحديث: ${new Date(article.lastModified).toLocaleDateString('ar-SA')}</span>
                    </div>
                </footer>
            </article>
        `;

        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    shareArticle(articleId) {
        const article = this.newsEngine.getArticle(articleId);
        if (!article) return;

        if (navigator.share) {
            navigator.share({
                title: article.title,
                text: article.summary || this.newsEngine.generateSummary(article.content),
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback: copy to clipboard
            const shareText = `${article.title}\n${window.location.href}`;
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('تم نسخ رابط المقال');
            }).catch(() => {
                this.showNotification('فشل في نسخ الرابط');
            });
        }
    }

    closeModal() {
        const modal = document.getElementById('article-modal');
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

    showNotification(message) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification';
        notificationDiv.textContent = message;
        
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            notificationDiv.classList.add('show');
        }, 10);

        setTimeout(() => {
            notificationDiv.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notificationDiv);
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.newsController = new NewsController();
});