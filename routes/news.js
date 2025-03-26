// backend/routes/news.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const summarizeArticle = require('../utils/summarizer');

async function processArticles(data, category) {
    const articlePromises = data.articles.map(async (article) => {
        try {
            // Use NewsAPI's content if available, fallback to description
            const contentToSummarize = article.content || article.description || '';
            const summary = summarizeArticle(contentToSummarize);
            const summary_txt = article.description || summary;
            console.log("summary:", summary);
            console.log("summary_txt:", summary_txt);

            return {
                title: article.title,
                description: article.description,
                summary: summary_txt,  // use the summarized text
                url: article.url,
                urlToImage: article.urlToImage,
                category: category || 'general',
                publishedAt: article.publishedAt,
                source: article.source.name
            };
        } catch (err) {
            console.error(`Error processing article ${article.title}:`, err);
            return {
                ...article,
                summary: 'Summary not available',
                category: category || 'general'
            };
        }
    });

    return Promise.all(articlePromises);
}

router.get('/', async (req, res) => {
    // Read country, source, and category from query parameters
    const { category, country, source } = req.query;
    try {
        let url = `https://newsapi.org/v2/top-headlines?pageSize=50&apiKey=${process.env.NEWS_API_KEY}`;

        // Prioritize source over country since NewsAPI ignores country if source is provided
        if (source) {
            url += `&sources=${source}`;
        } else if (country) {
            url += `&country=${country}`;
        } else {
            // Default to US if no country or source is provided
            url += `&country=us`;
        }

        if (category) {
            url += `&category=${category}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`NewsAPI error: ${response.statusText}`);

        const data = await response.json();
        const articles = await processArticles(data, category);

        // Filter out removed articles
        res.json(articles.filter(a => a.title !== '[Removed]'));

    } catch (err) {
        console.error('News route error:', err);
        res.status(500).json({
            error: 'Failed to fetch news',
            details: err.message
        });
    }
});

module.exports = router;
