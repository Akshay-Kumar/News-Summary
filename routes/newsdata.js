// backend/routes/news.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const summarizeArticle = require('../utils/summarizer');

async function processArticles(data, category) {
    const articlePromises = data.results.map(async (article) => {
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
                content: article.content, // get full content of the article
                url: article.link,
                urlToImage: article.image_url,
                category: category || 'top',
                publishedAt: article.pubDate,
                source: article.source_name
            };
        } catch (err) {
            console.error(`Error processing article ${article.title}:`, err);
            return {
                ...article,
                summary: 'Summary not available',
                category: category || 'top'
            };
        }
    });

    return Promise.all(articlePromises);
}

router.get('/', async (req, res) => {
    // Read country, source, and category from query parameters
    const { category, country, source, language } = req.query;
    try {
        let url = `https://newsdata.io/api/1/latest?apikey=${process.env.NEWSDATA_API_KEY}`;
        /*
        if source is selected, country and category cannot be added to the query string only while using newsapi.org
        this does not apply if using newsdata.io api
        */
        if (source) {
            url += `&domain=${source}`;
        }
        if (country) {
            url += `&country=${country}`;
        }

        if (category) {
            if(category === 'general'){
                url += `&category=top`;
            }
            else{
                url += `&category=${category}`;
            }
        }

        //set default language as english
        if (language) {
            url += `&language=${language}`;
        }
        else{
            url += `&language=en`;
        }

        // remove duplicate articles
        url += `&removeduplicate=1`;

        // uncomment this code if using newsapi.org
        /*
        else{
            if (country) {
                url += `&country=${country}`;
            } else {
                // Default to US if no country or source is provided
                url += `&country=ca`;
            }

            if (category) {
                if(category === 'general'){
                    url += `&category=top`;
                }
                else{
                    url += `&category=${category}`;
                }
            }

            //set default language as english
            if (language) {
                url += `&language=${language}`;
            }
            else{
                url += `&language=en`;
            }

            // remove duplicate articles
            url += `&removeduplicate=1`;
        }
        */

        console.log("url:",url)

        const response = await fetch(url);
        if (!response.ok) throw new Error(`NewsDataAPI error: ${response.statusText}`);

        const data = await response.json();
        //console.log("Raw API response:", data);
        console.log("status:",data.status);
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
