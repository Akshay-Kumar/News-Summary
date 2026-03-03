const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();
const WorldNewsArticle = require('../models/WorldNewsArticle');
const KeyManager = require('../utils/KeyManager');
const fs = require('fs');
const path = require('path');
const WORLD_NEWS_BASE_URL = 'https://api.worldnewsapi.com';
const api_article_fetch_limit = 25;
const db_article_fetch_limit = 25;
const search_news_api_route = 'search-news';
const top_news_api_route = 'top-news';

class NewsService {

    // keep track for api quota left and prevent from making more requests
    static api_quota_left = 0;
    static savedCount = 0;
    static sleep_time = 2000;
    static sleep_msg = `sleeping for ${NewsService.sleep_time/1000} seconds...`;
    static async getMetaData(type) {
        if (type !== 'country' && type !== 'source' && type !== 'category') {
            throw new Error("Type must be 'country', 'source' or 'category'");
        }

        const filePath = path.join(__dirname, 'meta-data.xml');
        const xmlData = fs.readFileSync(filePath, 'utf-8');
        const regex = new RegExp(`<${type} code="(.*?)">(.*?)<\\/${type}>`, 'g');

        const matches = [...xmlData.matchAll(regex)];

        const result = matches.map(match => ({
            code: match[1],
            name: match[2]
        }));

        return result;
    }

    static async waitUntilQuotaIsPositive(progressMsg = () => {}) {
        const MAX_RETRIES = 48; // Retry every 30 minutes for up to 24 hours
        const RETRY_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

        let retries = 0;

        while (NewsService.api_quota_left < 0 && retries < MAX_RETRIES) {
            // Check if all keys exhausted before waiting
            if (KeyManager.allKeysExhausted(NewsService.api_quota_left)) {
                throw new Error("[NewsService] All API keys exhausted. Cannot fetch news.");
            }

            let warn_msg = `[NewsService] API quota is negative (${NewsService.api_quota_left}). Retrying in 30 minutes... [Attempt ${retries + 1}]`;
            console.warn(warn_msg);
            progressMsg(warn_msg);
            await NewsService.sleep(RETRY_INTERVAL_MS);

            // Ping a lightweight API route (e.g., top-news for a single country) just to check quota
            try {
                const url = `${WORLD_NEWS_BASE_URL}/${top_news_api_route}?api-key=${KeyManager.getActiveApiKey()}&language=en&number=1`;
                const res = await axios.get(url);
                const newQuota = parseFloat(res.headers['x-api-quota-left']);
                NewsService.api_quota_left = newQuota;
                warn_msg = `[NewsService] Checked quota: ${newQuota}`;
                console.log(warn_msg);
                progressMsg(warn_msg);
            } catch (err) {
                console.error("[NewsService] Error while checking API quota", err.message);
            }

            retries++;
        }

        if (NewsService.api_quota_left < 0) {
            throw new Error("[NewsService] API quota did not reset in expected time.");
        }
    }

    static async getAllNews(
        fetchTopNews,
        fetchNewsBySourceCountry,
        fetchNewsByCategory,
        fetchNewsByNewsSources,
        progressCallback = () => {},
        progressMsg = () => {}
    ) {
        let language = 'en';
        let sort_by = 'publish-time';
        let sort_direction = 'DESC';

        // Reset counter
        NewsService.savedCount = 0;

        let baseParams = {
            base_url: WORLD_NEWS_BASE_URL,
            api_key: KeyManager.getActiveApiKey(),
            language: "en",
            sort_by,
            sort_direction
        };

        const fetchFunctions = [
            { enabled: fetchTopNews, fn: NewsService.getTopNews, name: 'TopNews', extraParams: { api_route: top_news_api_route, headlines_only: 'false' } },
            { enabled: fetchNewsBySourceCountry, fn: NewsService.getNewsBySourceCountry, name: 'NewsBySourceCountry', extraParams: { api_route: search_news_api_route } },
            { enabled: fetchNewsByCategory, fn: NewsService.getNewsByCategory, name: 'NewsByCategory', extraParams: { api_route: search_news_api_route } },
            { enabled: fetchNewsByNewsSources, fn: NewsService.getNewsByNewsSources, name: 'NewsByNewsSources', extraParams: { api_route: search_news_api_route } }
        ];

        for (const fetchItem of fetchFunctions) {
            if (!fetchItem.enabled) continue;

            if (NewsService.api_quota_left < 0 && KeyManager.allKeysExhausted(NewsService.api_quota_left)) {
                console.error(`[NewsService] All API keys exhausted. Stopping fetch for ${fetchItem.name}.`);
                break;
            }

            console.log(`[NewsService] Fetching ${fetchItem.name} from API.`);

            try {
                await fetchItem.fn({
                    ...baseParams,
                    ...fetchItem.extraParams,
                    progressCallback,
                    progressMsg
                });
            } catch (error) {
                console.error(`[NewsService] Error fetching ${fetchItem.name}:`, error.message || error);
            }
        }

        return NewsService.savedCount;
    }

    static async getTopNews({ base_url, api_route, api_key, language = 'en', headlines_only = 'false', sort_by = 'publish-time', sort_direction = 'DESC', progressCallback, progressMsg }){

        let baseParams  = {
            base_url,
            api_route,
            api_key,
            language,
            extra: `&headlines-only=${headlines_only}&sort=${sort_by}&sort-direction=${sort_direction}`
        };
        let countries = await NewsService.getMetaData('country');
        const totalCountries = countries.length;
        for(let i = 0; i < totalCountries; i++){
            const country = countries[i];
            const params = { ...baseParams, country: country.code }; // ✅ keep params object
            const url = await NewsService.buildUrl(params);
            console.log(`[NewsService] fetching top news for: ${country.name}`);
            let result = await NewsService.fetchAndCacheNews({url: url, api_route: api_route, params });
            if(!result.success){
                console.log(`[NewsService] Failed fetching top news for: ${country.name}`)
            }
            if (result.x_api_quota_left){
                console.log(`[NewsService] X-API-Quota-Left for today: ${result.x_api_quota_left}`)
            }
            // update api quota left and article saved count
            NewsService.api_quota_left = result.x_api_quota_left;
            NewsService.savedCount += result.savedCount;

            progressCallback(i + 1, totalCountries, 'TopNews'); // 🟢 progress update
            console.log(NewsService.sleep_msg)
            await NewsService.sleep(NewsService.sleep_time);
        }
        return NewsService.savedCount;
    }

    static async getNewsBySourceCountry({base_url, api_route, api_key, language = 'en', sort_by = 'publish-time', sort_direction = 'DESC', progressCallback, progressMsg}){
        if (NewsService.api_quota_left < 0) {
            await NewsService.waitUntilQuotaIsPositive(progressMsg);
        }

        let baseParams = {
            base_url,
            api_route,
            api_key,
            language,
            extra: `&sort=${sort_by}&sort-direction=${sort_direction}`
        };
        let countries = await NewsService.getMetaData('country');
        const totalCountries = countries.length;
        for(let i = 0; i < totalCountries; i++){
            const country = countries[i];
            const params = { ...baseParams, country: country.code };
            const url = await NewsService.buildUrl(params);
            console.log(`[NewsService] fetching news for: ${country.name}`);
            let result = await NewsService.fetchAndCacheNews({url: url, api_route: api_route, params });
            if(!result.success){
                console.log(`[NewsService] Failed fetching news for: ${country.name}`)
            }
            if (result.x_api_quota_left){
                console.log(`[NewsService] X-API-Quota-Left for today: ${result.x_api_quota_left}`)
            }
            // update api quota left and article saved count
            NewsService.api_quota_left = result.x_api_quota_left;
            NewsService.savedCount += result.savedCount;

            progressCallback(i + 1, totalCountries, 'NewsBySourceCountry'); // 🟢 progress update
            console.log(NewsService.sleep_msg)
            await NewsService.sleep(NewsService.sleep_time);
        }
        return NewsService.savedCount;
    }

    static async getNewsByCategory({ base_url, api_route, api_key, language = 'en', sort_by = 'publish-time', sort_direction = 'DESC', progressCallback , progressMsg }){
        if (NewsService.api_quota_left < 0) {
            await NewsService.waitUntilQuotaIsPositive(progressMsg);
        }

        let baseParams = {
            base_url,
            api_route,
            api_key,
            language,
            extra: `&sort=${sort_by}&sort-direction=${sort_direction}`
        };
        let categories = await NewsService.getMetaData('category');
        let totalCategories = categories.length;
        for(let i = 0; i < totalCategories; i++){
            const category = categories[i];
            const params = { ...baseParams, category: category.code };
            const url = await NewsService.buildUrl(params);
            let result = await NewsService.fetchAndCacheNews({ url, api_route, params });
            if(!result.success){
                console.log(`[NewsService] Failed fetching news for: ${category.name}`)
            }
            if (result.x_api_quota_left){
                console.log(`[NewsService] X-API-Quota-Left for today: ${result.x_api_quota_left}`)
            }
            // update api quota left and article saved count
            NewsService.api_quota_left = result.x_api_quota_left;
            NewsService.savedCount += result.savedCount;

            progressCallback(i + 1, totalCategories, 'NewsByCategory'); // 🟢 progress update
            console.log(NewsService.sleep_msg)
            await NewsService.sleep(NewsService.sleep_time);
        }
        return NewsService.savedCount;
    }

    static async getNewsByNewsSources({ base_url, api_route, api_key, language = 'en', sort_by = 'publish-time', sort_direction = 'DESC', progressCallback , progressMsg }){
        if (NewsService.api_quota_left < 0) {
            await NewsService.waitUntilQuotaIsPositive(progressMsg);
        }

        let baseParams = {
            base_url,
            api_route,
            api_key,
            language,
            extra: `&sort=${sort_by}&sort-direction=${sort_direction}`
        };
        let sources = await NewsService.getMetaData('source');
        let totalSources = sources.length;
        for(let i = 0; i < totalSources; i++){
            const source = sources[i];
            const params = { ...baseParams, source: source.code };
            const url = await NewsService.buildUrl(params);
            let result = await NewsService.fetchAndCacheNews({ url, api_route, params });
            if(!result.success){
                console.log(`[NewsService] Failed fetching news for: ${source.name}`)
            }
            if (result.x_api_quota_left){
                console.log(`[NewsService] X-API-Quota-Left for today: ${result.x_api_quota_left}`)
            }
            // update api quota left and article saved count
            NewsService.api_quota_left = result.x_api_quota_left;
            NewsService.savedCount += result.savedCount;

            progressCallback(i + 1, totalSources, 'NewsByNewsSources'); // 🟢 progress update
            console.log(NewsService.sleep_msg)
            await NewsService.sleep(NewsService.sleep_time);
        }
        return NewsService.savedCount;
    }

    static async buildUrl(params) {
        const {
            base_url,
            api_route,
            api_key,
            country,
            source,
            text,
            category,
            language,
            article_fetch_limit,
            extra = '' // rename add_params → extra
        } = params;

        let url = `${base_url}/${api_route}?api-key=${api_key}`;

        if (category && category !== 'general') {
            url += `&categories=${category}`;
        }
        if (text) {
            url += `&text=${encodeURIComponent(text)}`;
        }
        if (country) {
            url += `&source-country=${country}`;
        } else if (source) {
            url += `&news-sources=${source}`;
        }
        if (article_fetch_limit) {
            url += `&number=${article_fetch_limit}`;
        }

        url += `&language=${language || 'en'}`;
        url += extra;

        return url;
    }


    static async saveArticleToMongo(article, source) {
        try {
            // Upsert (insert if not exists, update if exists by "id")
            await WorldNewsArticle.updateOne(
                { id: NewsService.generateArticleId(article) /* article.id */ },
                {
                    $set: {
                        title: article.title || '',
                        description: article.summary || 'No description available.',
                        summary: article.summary || 'No summary available.',
                        content: article.text || '',
                        url: article.url,
                        urlToImage: article.image || '',
                        category: article.category || 'general',
                        publishedAt: new Date(article.publish_date),
                        source_name: NewsService.extractSourceName(article.url) || '',
                        source_country: article.source_country || '',
                        source_url: NewsService.extractSourceUrl(article.url) || '',
                        source_icon: NewsService.extractSourceIcon(article.url) || '',
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
    static async fetchAndCacheNews({url = '', api_route = '', source = '', params= {}, perArticleCallback = () => {}} = {}) {
        try {
            // define timeout
            const CONN_TIMEOUT = 500000;
            // initialize article save count
            let savedCount = 0;
            let articles = [];

            if(url){
                console.log(`[NewsService] Fetching news with url: ${url}`);
            }
            else{
                console.log(`[NewsService] empty or null url: ${url}`);
                return { success: false, savedCount };
            }

            const response = await axios.get(url, {
                timeout: CONN_TIMEOUT
            });
            const x_api_quota_left = parseFloat(response.headers['x-api-quota-left']);
            if (!isNaN(x_api_quota_left)) {
                NewsService.api_quota_left = x_api_quota_left;
                if (x_api_quota_left <= 0) {
                    console.warn(`[NewsService] API quota exhausted.`);

                    // Check if all keys exhausted
                    if (KeyManager.allKeysExhausted(NewsService.api_quota_left)) {
                        throw new Error("[NewsService] All API keys exhausted. Cannot fetch news.");
                    }

                    const newKey = KeyManager.markKeyExhausted();
                    const updated_url = await NewsService.buildUrl({ ...params, api_key: newKey });
                    return NewsService.fetchAndCacheNews({ url: updated_url, api_route, params, perArticleCallback });
                }
            }

            if(response.status !== 200){
                console.error("[NewsService] Error occurred while fetching API request", response.statusText);
                return { success: false, savedCount };
            }

            if(api_route === 'search-news'){
                articles = response.data.news;
            } else{
                articles = await NewsService.processTopNews(response.data);
            }

            console.log(`[NewsService] Fetched ${articles.length} articles from API.`);

            // save articles to mongo db
            for (const article of articles) {
                // const articleId = NewsService.generateArticleId(article);
                console.log("title:", article.title);
                await NewsService.saveArticleToMongo(article, source);
                savedCount++;
                perArticleCallback(savedCount);
            }
            console.log(`[NewsService] Cached ${savedCount} articles to MongoDB.`);

            return { success: true, savedCount, x_api_quota_left: x_api_quota_left };

        } catch (error) {
            if (error.response && [401, 402, 403].includes(error.response.status)) {
                console.warn(`[NewsService] Unauthorized with key index. Rotating...`);
                // Check if all keys exhausted before rotating
                if (KeyManager.allKeysExhausted(NewsService.api_quota_left)) {
                    throw new Error("[NewsService] All API keys exhausted. Cannot fetch news.");
                }
                const newKey = KeyManager.rotateApiKey();
                const updated_url = await NewsService.buildUrl({ ...params, api_key: newKey });
                return NewsService.fetchAndCacheNews({ url: updated_url, api_route, params, perArticleCallback });
            }
            throw error;
        }

    }

    static async processTopNews(apiResponse) {
        const articles = [];

        for (const group of apiResponse.top_news) {
            for (const newsItem of group.news) {
                const { id, title, text, summary, url, image, publish_date, language, source_country } = newsItem;

                const articleData = {
                    id,
                    title,
                    text,
                    summary,
                    url,
                    image,
                    publish_date,
                    language,
                    source_country,
                };

                articles.push(articleData);
            }
        }

        return articles;
    }

    /**
     * Load news from MongoDB (cached)
     * Supports filters: category, date range
     */
    static async loadCachedNews({ country = '', source = '', category = '', fromDate = null, toDate = null, language = 'en', limit = 50, skip = 0 } = {}) {
        const query = { language };

        if (category) {
            query.category = category;
        }

        if(source){
            query.source_name = source;
        }

        if(country){
            query.source_country = country;
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

        console.log(`[NewsService] Loading cached news with query: ${JSON.stringify(query, null, 2)}`);

        const articles = await WorldNewsArticle.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        console.log(`[NewsService] Fetched ${articles.length} articles from MongoDB.`);
        return articles;
    }

    /**
     *  load cached
     */
    static async getCachedNews(options = {}) {
        let cachedArticles = [];
        try {
            cachedArticles = await NewsService.loadCachedNews(options);
        } catch (error) {
            console.error('[NewsService] Error occurred while fetching cached news.');
        }
        return cachedArticles;
    }

    /**
     * Generate article ID:
     * - Use hash of URL
     */
    static generateArticleId(article) {
        const hash = crypto.createHash('md5').update(article.title).digest('hex');
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

    static extractSourceName(articleUrl) {
        try {
            const urlObj = new URL(articleUrl);
            const hostname = urlObj.hostname.replace(/^www\./, '');
            const parts = hostname.split('.');

            // List of known 2-part TLDs (you can expand this)
            const doubleTLDs = ['co.uk', 'com.au', 'co.in', 'org.uk', 'com.pk'];

            const lastTwo = parts.slice(-2).join('.');
            const lastThree = parts.slice(-3).join('.');

            if (doubleTLDs.includes(lastTwo)) {
                return parts.length >= 3 ? parts[parts.length - 3] : parts[0];
            }

            return parts.length >= 2 ? parts[parts.length - 2] : hostname;
        } catch {
            return '';
        }
    }


    static extractSourceIcon(articleUrl) {
        try {
            const urlObj = new URL(articleUrl);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
        } catch {
            return '';
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports = NewsService;
