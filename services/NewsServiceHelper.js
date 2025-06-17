const NewsService = require('./NewsService');
const intervalMinutes = 120;

const refreshNews = async () => {
//run on interval
    setInterval(async () => {
        try {
            console.log(`[${new Date().toISOString()}] Running getAllNews...`);
            let fetchTopNews = true;
            let fetchNewsBySourceCountry = true;
            let fetchNewsByCategory = true;
            let fetchNewsByNewsSources = true;
            await NewsService.getAllNews(fetchTopNews, fetchNewsBySourceCountry, fetchNewsByCategory, fetchNewsByNewsSources);
            console.log(`[${new Date().toISOString()}]News fetched and saved.`);
        } catch (error) {
            console.error('Error during getAllNews:', error);
        }
    }, intervalMinutes * 60 * 1000);

// Run immediately
    await (async () => {
        try {
            console.log(`[${new Date().toISOString()}] Running getAllNews on startup...`);
            let fetchTopNews = true;
            let fetchNewsBySourceCountry = true;
            let fetchNewsByCategory = true;
            let fetchNewsByNewsSources = true;
            await NewsService.getAllNews(fetchTopNews, fetchNewsBySourceCountry, fetchNewsByCategory, fetchNewsByNewsSources);
            console.log(`[${new Date().toISOString()}]News fetched and saved.`);
        } catch (err) {
            console.error('Startup fetch error:', err);
        }
    })();

};

module.exports = refreshNews;
