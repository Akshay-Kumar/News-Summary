// models/JobRun.js
const mongoose = require('mongoose');

const JobRunSchema = new mongoose.Schema({
    jobName: String,
    runType: { type: String, enum: ['manual', 'auto'], default: 'auto' },
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['running', 'idle', 'error'] },
    fetchedCount: Number,
    error: String,
    info: String,
    progress: Number // optional: 0–100
});

module.exports = mongoose.model('JobRun', JobRunSchema);
