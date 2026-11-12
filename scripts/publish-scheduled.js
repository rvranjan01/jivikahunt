/**
 * @file scripts/publish-scheduled.js
 * @description Standalone CLI script that transitions scheduled job postings to published status.
 * Can be run every 10 to 15 minutes by Heroku Scheduler or an external cron worker.
 *
 * Usage:
 *   node scripts/publish-scheduled.js
 */

import connectDB from '../lib/db.js';
import Job from '../models/Job.js';
import { postJobToTelegram } from '../lib/telegram.js';
import { recordAuditLog } from '../lib/audit.js';

async function publishScheduledJobs() {
  console.info('--- Checking for Scheduled Jobs Ready to Publish ---');
  await connectDB();

  const now = new Date();

  // Find all scheduled jobs whose publication time has arrived
  const readyJobs = await Job.find({
    status: 'scheduled',
    publishAt: { $lte: now },
  });

  console.info(`Found ${readyJobs.length} scheduled jobs ready for publication.`);

  let publishedCount = 0;
  for (const job of readyJobs) {
    job.status = 'published';
    job.createdAt = now; // Refresh publication timestamp
    await job.save();

    publishedCount += 1;
    console.info(`✓ Published: "${job.title}" at ${job.company?.name} (slug: ${job.slug})`);

    // Non-blocking Telegram channel broadcast
    try {
      await postJobToTelegram(job);
    } catch (tErr) {
      console.warn(`Telegram broadcast skipped for ${job.slug}:`, tErr.message);
    }

    // Log security audit
    await recordAuditLog({
      action: 'job.publish_scheduled',
      actorType: 'system_scheduler',
      targetType: 'Job',
      targetId: job._id.toString(),
      metadata: {
        title: job.title,
        slug: job.slug,
        publishAt: job.publishAt,
      },
    });
  }

  console.info(`Completed. Published ${publishedCount} jobs.`);
  console.info('----------------------------------------------------');
  process.exit(0);
}

publishScheduledJobs().catch((err) => {
  console.error('Fatal error in publish-scheduled script:', err);
  process.exit(1);
});
