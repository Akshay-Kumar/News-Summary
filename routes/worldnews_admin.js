const express = require('express');
const router = express.Router();
const WorldNewsArticle = require('../models/WorldNewsArticle');
const adminAuth = require('../middleware/adminAuth'); // 👈 Add this!

// GET stored articles with pagination + search (Protected)
router.get('/', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const query = search
            ? { title: { $regex: search, $options: 'i' } }
            : {};

        const totalArticles = await WorldNewsArticle.countDocuments(query);
        const articles = await WorldNewsArticle.find(query)
            .sort({ publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            articles,
            totalArticles,
            page,
            pages: Math.ceil(totalArticles / limit)
        });

    } catch (err) {
        console.error('WorldNewsAdmin route error:', err);
        res.status(500).json({
            error: 'Failed to fetch stored World News articles',
            details: err.message
        });
    }
});

// DELETE an article (Protected)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        await WorldNewsArticle.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        console.error('Delete WorldNewsArticle error:', err);
        res.status(500).json({
            error: 'Failed to delete article',
            details: err.message
        });
    }
});

// UPDATE article title (Protected)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const updated = await WorldNewsArticle.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title,
                summary: req.body.summary
            },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        console.error('Update WorldNewsArticle error:', err);
        res.status(500).json({
            error: 'Failed to update article',
            details: err.message
        });
    }
});

module.exports = router;
