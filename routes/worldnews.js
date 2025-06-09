// backend/routes/worldnews.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const WorldNewsArticle = require('../models/WorldNewsArticle');
const WORLD_NEWS_BASE_URL = 'https://api.worldnewsapi.com';
const NewsService = require('../services/NewsService');

async function processArticles(data, category, source) {
    const articlePromises = data.news.map(async (article) => {
        try {
            const summary_txt = article.summary || 'No summary available.';
            console.log("summary_txt:", summary_txt);
            console.log("article_image: ", article.image);
            return {
                id: article.id,
                title: article.title,
                description: article.summary || 'No description available.',
                summary: summary_txt,
                content: article.text,
                url: article.url,
                urlToImage: article.image,  // World News API uses `image`
                category: category,
                publishedAt: article.publish_date,
                source_name: source || '', // optional fallback
                source_url: '',  // World News API does not provide source url directly
                source_icon: '', // World News API does not provide icon directly
                language: article.language
            };
        } catch (err) {
            console.error(`Error processing article ${article.title}:`, err);
            return {
                ...article,
                summary: 'Summary not available',
                category: category
            };
        }
    });

    return Promise.all(articlePromises);
}

router.get('/', async (req, res) => {
    const { category, country, source, language, text } = req.query;
    try {
        let api_article_fetch_limit = 25;
        let db_article_fetch_limit = 25;
        let add_params = '&sort=publish-time&sort-direction=DESC';
        let api_route = 'search-news';
        let params = {
            base_url: WORLD_NEWS_BASE_URL,
            api_route: api_route,
            api_key: process.env.WORLDNEWS_API_KEY,
            country: country,
            source: source,
            text: text,
            category: category,
            language: language,
            article_fetch_limit: api_article_fetch_limit,
            add_params: add_params
        }
        let url = NewsService.buildUrl(params);

        console.log("World News API url:", url);

        // build params to fetch news
        let params2 = {
            url: url,
            country: country,
            source: source,
            text: text,
            category: category,
            language: language,
            fromDate: null,
            toDate: null,
            limit: db_article_fetch_limit,
            skip: 0
        }
        // fetch and cache news articles
        const articles = await NewsService.getNewsWithFallback(params2);
        res.json(articles);

    } catch (err) {
        console.error('WorldNews route error:', err);
        res.status(500).json({
            error: 'Failed to fetch news from World News API',
            details: err.message
        });
    }
});

module.exports = router;
