const mongoose = require('mongoose');

const WorldNewsArticleSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // External API article ID or hash of URL
    title: { type: String, required: true },
    description: { type: String, default: '' },
    summary: { type: String, default: '' },
    content: { type: String, default: '' },
    url: { type: String, required: true },
    urlToImage: { type: String, default: '' },
    category: { type: String, index: true }, // index for fast filtering
    publishedAt: { type: Date, index: true },
    source_name: { type: String, default: '' },
    source_url: { type: String, default: '' },
    source_icon: { type: String, default: '' },
    language: { type: String, default: 'en' },
    is_cached: { type: Boolean, default: false },
    fetchedAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WorldNewsArticle', WorldNewsArticleSchema);
