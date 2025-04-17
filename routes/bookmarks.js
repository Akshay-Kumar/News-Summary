// backend/routes/bookmarks.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bookmark = require('../models/Bookmark');

// Get current user's bookmarks
router.get('/', auth, async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({ user: req.user.id });
        res.json(bookmarks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Add a bookmark
router.post('/', auth, async (req, res) => {
    const { article } = req.body;
    try {
        const newBookmark = new Bookmark({
            user: req.user.id,
            article,
        });
        const bookmark = await newBookmark.save();
        res.json(bookmark);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Remove a bookmark by its ID
router.delete('/:id', auth, async (req, res) => {
    try {
        const bookmark = await Bookmark.findById(req.params.id);
        if (!bookmark) return res.status(404).json({ msg: 'Bookmark not found' });
        if (bookmark.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        await Bookmark.findByIdAndDelete(bookmark.id);
        res.json({ msg: 'Bookmark removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
