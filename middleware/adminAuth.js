// backend/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming your User model is in models/User.js
require('dotenv').config();

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Optional: Check if user is admin (assuming user.role === 'admin' for admin users)
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }

        next();
    } catch (err) {
        console.error('adminAuth error:', err);
        res.status(401).json({ error: 'Token is not valid' });
    }
};
