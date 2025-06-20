const express = require('express');
const router = express.Router();
const JobRun = require('../models/JobRun');
const NewsService = require('../services/NewsService');
const jobStatus = require('../jobs/jobStatus'); // Adjust path if needed

function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

router.get('/history', async (req, res) => {
    try {
        const history = await JobRun.find({ jobName: 'refreshNews' }).sort({ startTime: -1 }).limit(50);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch job history', error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const status = await JobRun.findOne({ jobName: 'refreshNews' }).sort({ startTime: -1 });
        res.json(status || {});
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch job status', error: err.message });
    }
});

router.post('/run', async (req, res) => {
    if (jobStatus.isManualRunning || jobStatus.isAutoRunning) {
        return res.status(429).json({ message: 'Job already running' });
    }

    jobStatus.isManualRunning = true;

    const run = new JobRun({ jobName: 'refreshNews', runType: 'manual', startTime: new Date(), status: 'running' });
    await run.save();

    const throttledProgressUpdate = throttle((progressCurrent, total, type) => {
        const percent = ((progressCurrent / total) * 100).toFixed(1);
        const message = `[Progress] ${type} - ${progressCurrent}/${total} (${percent}%)`;
        console.log(message);
        JobRun.findByIdAndUpdate(run._id, { progress: percent, info: message }).exec();
    }, 10000);

    const logWarningMsg = throttle(async (message) => {
        console.log(message);
        await JobRun.findByIdAndUpdate(run._id, { error: message });
    }, 10000);

    try {
        const fetchedCount = await NewsService.getAllNews(true, true, true, true, (progressCurrent, total, type) => {
            throttledProgressUpdate(progressCurrent, total, type);
        }, (progressMsg)=>{
            logWarningMsg(progressMsg);
        });
        /*
        if (NewsService.api_quota_left < 0) {
            run.error = `[NewsService] API quota is negative (${NewsService.api_quota_left}). Retrying in 30 minutes...`;
        }
         */

        run.status = 'idle';
        run.endTime = new Date();
        run.fetchedCount = fetchedCount;
        await run.save();

        res.json({ message: 'Job run completed', fetchedCount });
    } catch (err) {
        run.status = 'error';
        run.endTime = new Date();
        run.error = err.message;
        await run.save();

        res.status(500).json({ message: 'Job run failed', error: err.message });
    } finally {
        jobStatus.isManualRunning = false;
    }
});

module.exports = router;
