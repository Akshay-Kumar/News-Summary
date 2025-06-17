// backend/routes/worldnews.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
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
        let db_article_fetch_limit = 25;

        // build params to fetch news
        let params = {
            country: country,
            source: source,
            text: text,
            category: category,
            language: language || 'en',
            fromDate: null,
            toDate: null,
            limit: db_article_fetch_limit,
            skip: 0
        }
        // fetch and cache news articles
        const articles = await NewsService.getCachedNews(params);
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
