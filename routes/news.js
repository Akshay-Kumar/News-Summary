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
            console.log("summary:",summary)
            return {
                title: article.title,
                description: article.description,
                summary: summary,
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
    const { category } = req.query;
    try {
        const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=50${
            category ? `&category=${category}` : ''
        }&apiKey=${process.env.NEWS_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`NewsAPI error: ${response.statusText}`);

        const data = await response.json();
        const articles = await processArticles(data, category);

        res.json(articles.filter(a => a.title !== '[Removed]')); // Filter removed articles

    } catch (err) {
        console.error('News route error:', err);
        res.status(500).json({
            error: 'Failed to fetch news',
            details: err.message
        });
    }
});

module.exports = router;
