// backend/routes/newsdatahub.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const { handleError } = require('../utils/errorHandler');
const NEWSDATAHUB_URL = 'https://api.newsdatahub.com/v1/news';


async function processArticles(data, category) {
    const articlePromises = data.map(async (article) => {
        try {
            // Use NewsAPI's content if available, fallback to description
            const summary_txt = article.description;
            console.log("summary_txt:", summary_txt);

            return {
                id: article.id,
                title: article.title,
                description: article.description,
                summary: summary_txt,  // use the summarized text
                content: article.content, // get full content of the article
                url: article.article_link,
                urlToImage: article.media_url,
                category: category || 'general',
                publishedAt: article.pub_date,
                source_name: article.source_title,
                source_url: article.source_link,
                source_icon: article.media_thumbnail,
                language: article.language
            };
        } catch (err) {
            console.error(`Error processing article ${article.title}:`, err);
            return {
                ...article,
                summary: 'Summary not available',
                category: category || ''
            };
        }
    });

    return Promise.all(articlePromises);
}

router.get('/', async (req, res) => {
    // Read country, source, and category from query parameters
    let { category, country, source, language } = req.query;
    try {
        let params = {};
        let url = `${NEWSDATAHUB_URL}`;
        let cursor = null;
        let articles = [];
        const headers = {
            'X-Api-Key': process.env.NEWSDATAHUB_API_KEY,
            'Accept': 'application/json',
            'User-Agent': 'News-Summary/2.0'
        };

        if (language) {
            params['language'] = language;
        }
        else{
            params['language'] = 'en';
        }

        if (category) {
            params['topic'] = category;
        }
        else{
            params['topic'] = "general";
        }
        // limit articles upto page 5
        for(let i=0; i<5; i++){
            params['next_cursor'] = cursor;
            console.log("params:", params);
            const response = await axios.get(url,{
                headers: headers,
                params: params
            });
            if (response.statusText !== "OK") throw new Error(`NewsDataHubAPI error: ${response.statusText}`);
            if (response.status !== 200) {
                const errorResponse = handleError(response.status);
                return res.status(response.status).json(errorResponse);
            }
            const articleData = await response.data;
            // console.log("data:",articleData.data);
            articles.push(...await processArticles(articleData.data, category));
            cursor = articleData.next_cursor;
            if(!cursor){
                break;
            }
        }
        // Filter out removed articles
        res.json(articles.filter(a => a.title !== '[Removed]'));

    } catch (err) {
        console.error('News route error:', err);
        // In case of unexpected errors
        const errorResponse = handleError(500, err.message);
        res.status(500).json(errorResponse);
    }
});

module.exports = router;
