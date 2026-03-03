const NewsService = require('../services/NewsService');
const JobRun = require('../models/JobRun');
const jobStatus = require('./jobStatus');
const throttle = require('../utils/throttle');
const intervalMinutes = 360; // fetch news after every 6 hours

const refreshNews = async () => {
    const jobName = 'refreshNews';

    const runJob = async () => {
        if (jobStatus.isAutoRunning) {
            console.log('Auto job already running, skipping this run.');
            return;
        }

        jobStatus.isAutoRunning = true;

        const run = new JobRun({ jobName, runType: 'auto', startTime: new Date(), status: 'running' });
        await run.save();

        const throttledProgressUpdate = throttle(async (progressCurrent, total, type) => {
            const percent = ((progressCurrent / total) * 100).toFixed(1);
            const message = `[Progress] ${type} - ${progressCurrent}/${total} (${percent}%)`;
            console.log(message);
            await JobRun.findByIdAndUpdate(run._id, { progress: percent, info: message });
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
        } catch (err) {
            run.status = 'error';
            run.endTime = new Date();
            run.error = err.message;
            await run.save();
        } finally {
            jobStatus.isAutoRunning = false;
        }
    };

    await runJob();
    setInterval(runJob, intervalMinutes * 60 * 1000);
};

module.exports = refreshNews;
