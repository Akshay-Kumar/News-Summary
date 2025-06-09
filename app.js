// backend/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// Load env vars
dotenv.config();

const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const bookmarkRoutes = require('./routes/bookmarks');
const newsDataRoutes = require('./routes/newsdata');
const newsDataHubRoutes = require('./routes/newsdatahub');
const worldnewsRoutes = require('./routes/worldnews');
const worldnewsAdminRoute = require('./routes/worldnews_admin');

const app = express();
// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/newsdata', newsDataRoutes);
app.use('/api/newsdatahub', newsDataHubRoutes);
app.use('/api/worldnews', worldnewsRoutes);
app.use('/api/worldnews_admin', worldnewsAdminRoute);

module.exports = app;
