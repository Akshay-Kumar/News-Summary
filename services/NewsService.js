const axios = require('axios');
require('dotenv').config();
const WorldNewsArticle = require('../models/WorldNewsArticle');

class NewsService {
    static async buildUrl({ base_url, api_route, api_key, country, source, text, category, language, article_fetch_limit, add_params }) {
        let url = `${base_url}/${api_route}?api-key=${api_key}`;

        // World News API allows categories — map your "general" to nothing
        if (category && category !== 'general') {
            url += `&categories=${category}`;
        }

        // World News API allows search text
        if (text) {
            url += `&text=${encodeURIComponent(text)}`;
        }

        // either news-source or source-country must be used not together
        if(country){
            url += `&source-country=${country}`
        }
        else if(source){
            url += `&news-sources=${source}`
        }

        // Set language, default = en
        url += `&language=${language || 'en'}`;

        // limit number of results
        url += `&number=${article_fetch_limit}`;

        // sort by publish date in descending order
        url += add_params;

        return url;
    }

    static async saveArticleToMongo(article, category, source) {
        try {
            // Upsert (insert if not exists, update if exists by "id")
            await WorldNewsArticle.updateOne(
                { id: article.id },
                {
                    $set: {
                        title: article.title || '',
                        description: article.summary || 'No description available.',
                        summary: article.summary || 'No summary available.',
                        content: article.text || '',
                        url: article.url,
                        urlToImage: article.image || '',
                        category: category,
                        publishedAt: new Date(article.publish_date),
                        source_name: source || '',
                        source_url: NewsService.extractSourceUrl(article.url) || '',
                        source_icon: '', // You can implement icon lookup later
                        language: article.language,
                        is_cached: false,
                    }
                },
                { upsert: true }
            );
        } catch (err) {
            console.error(`Error saving article "${article.title}" to DB:`, err);
        }
    }
    /**
     * Fetch fresh news from external API
     * Cache it into MongoDB
     */
    static async fetchAndCacheNews({ text='', url = '', source = '', category = '', language = 'en', country = 'us' } = {}) {
        try {
            // initialize article save count
            let savedCount = 0;
            let articles = [];

            if(category){
                console.log(`[NewsService] Fetching news for category: ${category}`);
            }
            else if(source){
                console.log(`[NewsService] Fetching news for source: ${source}`);
            }

            const response = await axios.get(url);
            articles = response.data.news || [];
            console.log(`[NewsService] Fetched ${articles.length} articles from API.`);

            // save articles to mongo db
            for (const article of articles) {
                // const articleId = NewsService.generateArticleId(article);
                console.log("title:", article.title);
                await NewsService.saveArticleToMongo(article, category, source);
                savedCount++;
            }
            console.log(`[NewsService] Cached ${savedCount} articles to MongoDB.`);

            return { success: true, savedCount };

        } catch (error) {
            console.error('[NewsService] Error fetching news:', error.message);
            throw error;
        }
    }

    /**
     * Load news from MongoDB (cached)
     * Supports filters: category, date range
     */
    static async loadCachedNews({ source = '', category = '', fromDate = null, toDate = null, language = 'en', limit = 50, skip = 0 } = {}) {
        const query = { language };

        if (category) {
            query.category = category;
        }

        if(source){
            query.source_name = source;
        }

        if (fromDate || toDate) {
            query.publishedAt = {};
            if (fromDate) {
                query.publishedAt.$gte = new Date(fromDate);
            }
            if (toDate) {
                query.publishedAt.$lte = new Date(toDate);
            }
        }

        console.log(`[NewsService] Loading cached news with query:`, query);

        const articles = await WorldNewsArticle.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return articles;
    }

    /**
     * Fallback method:
     * Try API → if fails → load cached
     */
    static async getNewsWithFallback(options = {}) {
        try {
            await NewsService.fetchAndCacheNews(options);
        } catch (error) {
            console.warn('[NewsService] Falling back to cached news due to API error.');
        }

        const cachedArticles = await NewsService.loadCachedNews(options);
        return cachedArticles;
    }

    /**
     * Generate article ID:
     * - Use hash of URL
     */
    static generateArticleId(article) {
        const hash = crypto.createHash('md5').update(article.url).digest('hex');
        return hash;
    }

    /**
     * Extract base URL from article URL (for source_url)
     */
    static extractSourceUrl(articleUrl) {
        try {
            const urlObj = new URL(articleUrl);
            return `${urlObj.protocol}//${urlObj.hostname}`;
        } catch {
            return '';
        }
    }
}

module.exports = NewsService;
