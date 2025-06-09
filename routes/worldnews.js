// backend/routes/worldnews.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const summarizeArticle = require('../utils/summarizer');
const WORLD_NEWS_BASE_URL = 'https://api.worldnewsapi.com';

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
        let num_of_articles_to_fetch = 25;
        let url = `${WORLD_NEWS_BASE_URL}/search-news?api-key=${process.env.WORLDNEWS_API_KEY}`;

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
        url += `&number=${num_of_articles_to_fetch}`;

        // sort by publish date in descending order
        url += `&sort=publish-time&sort-direction=DESC`;


        console.log("World News API url:", url);

        const response = await axios.get(url);
        const data = response.data;

        console.log("available articles:", data.available);

        const articles = await processArticles(data, category, source);

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
