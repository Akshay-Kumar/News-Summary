// backend/models/Bookmark.js
const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    article: {
        title:       String,
        description: String,
        url:         String,
        category:    String,
        publishedAt: String,
    },
});

module.exports = mongoose.model('Bookmark', BookmarkSchema);
