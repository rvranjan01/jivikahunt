/**
 * @file scripts/daily-digest.js
 * @description Standalone CLI script for dispatching the daily job alerts digest to verified subscribers.
 * Can be triggered daily via Heroku Scheduler or cron (e.g. at 08:00 AM IST).
 *
 * Usage:
 *   node scripts/daily-digest.js
 */

import connectDB from '../lib/db.js';
import Subscriber from '../models/Subscriber.js';
import Job from '../models/Job.js';
import { sendDailyDigestEmail } from '../lib/email.js';
import { isJobExpired } from '../lib/time.js';

async function runDailyDigest() {
  console.info('--- Starting JivikaHunt Daily Digest Script ---');
  await connectDB();

  // Find non-expired jobs published in the past 24 hours
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rawJobs = await Job.find({
    status: 'published',
    createdAt: { $gte: past24Hours },
  })
    .sort({ createdAt: -1 })
    .lean();

  const freshJobs = rawJobs.filter((j) => !isJobExpired(j.lastDate));
  console.info(`Found ${freshJobs.length} active jobs published in the last 24 hours.`);

  if (freshJobs.length === 0) {
    console.info('No fresh jobs to send in today digest. Exiting gracefully.');
    process.exit(0);
  }

  // Find all confirmed subscribers
  const subscribers = await Subscriber.find({
    confirmedAt: { $ne: null },
  }).lean();

  console.info(`Found ${subscribers.length} confirmed alert subscribers.`);

  let sentCount = 0;
  for (const subscriber of subscribers) {
    // Match jobs against subscriber preferences
    const prefTypes = subscriber.preferences?.types || ['fresher', 'intern'];
    const prefBatches = subscriber.preferences?.batches || [];

    const matchingJobs = freshJobs.filter((job) => {
      const typeMatches = prefTypes.length === 0 || prefTypes.includes(job.type);
      const batchMatches =
        prefBatches.length === 0 ||
        (Array.isArray(job.batches) && job.batches.some((b) => prefBatches.includes(b)));
      return typeMatches || batchMatches;
    });

    if (matchingJobs.length > 0) {
      const result = await sendDailyDigestEmail({
        email: subscriber.email,
        jobs: matchingJobs.slice(0, 8),
        unsubscribeToken: subscriber.unsubscribeToken,
      });

      if (result.success) {
        sentCount += 1;
        await Subscriber.updateOne(
          { _id: subscriber._id },
          { $set: { lastDigestSentAt: new Date() } }
        );
      }
    }
  }

  console.info(`Successfully dispatched daily digest to ${sentCount} subscribers.`);
  console.info('--- Finished JivikaHunt Daily Digest Script ---');
  process.exit(0);
}

runDailyDigest().catch((err) => {
  console.error('Fatal error during daily digest run:', err);
  process.exit(1);
});
