/**
 * @file lib/telegram.js
 * @description Non-blocking Telegram Bot client for automated channel broadcasts on job publication.
 * Designed so that third-party Telegram outages never block or fail job publishing.
 */

import siteConfig from './siteConfig';
import { recordAuditLog } from './audit';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

/**
 * Formats job details into clean Markdown text for Telegram channel posts.
 * @param {Object} job
 * @returns {string} Markdown formatted message
 */
export function formatTelegramJobMessage(job) {
  const typeBadge = job.type.toUpperCase();
  const workModeBadge = job.workMode.toUpperCase();
  const locations = job.locations?.join(', ') || 'India';
  const batches = job.batches?.length ? `🎓 *Batches:* ${job.batches.join(', ')}\n` : '';
  const salary = job.salary ? `💰 *Salary:* ${job.salary}\n` : '';
  const skills = job.skills?.length ? `🛠️ *Skills:* ${job.skills.join(', ')}\n` : '';

  return (
    `🚀 *${job.title}*\n` +
    `🏢 *Company:* ${job.company?.name || 'Company'}\n` +
    `🏷️ *Type:* ${typeBadge} · *Mode:* ${workModeBadge}\n` +
    `📍 *Location:* ${locations}\n` +
    batches +
    salary +
    skills +
    `\n📝 *Overview:*\n${job.summary}\n\n` +
    `👉 [Apply on Official Careers Page](${job.applyUrl})\n` +
    `🌐 [View Details on ${siteConfig.name}](${siteConfig.url}/jobs/${job.slug})`
  );
}

/**
 * Dispatches a formatted job alert to the configured Telegram channel.
 * Never throws errors: all failures are recorded in the audit log without interrupting the calling process.
 *
 * @param {Object} job - Complete job document
 * @returns {Promise<{ success: boolean, simulated?: boolean, error?: string }>}
 */
export async function postJobToTelegram(job) {
  if (!botToken || !channelId) {
    console.info('Telegram Bot Token or Channel ID unconfigured. Skipping channel broadcast.');
    return { success: true, simulated: true };
  }

  const messageText = formatTelegramJobMessage(job);
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: messageText,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      const errorMsg = data?.description || 'Telegram API returned unsuccessful status';
      console.error('Telegram broadcast failed:', errorMsg);

      await recordAuditLog({
        action: 'telegram.post.failed',
        targetType: 'Job',
        targetId: job._id?.toString(),
        metadata: { error: errorMsg },
      });

      return { success: false, error: errorMsg };
    }

    await recordAuditLog({
      action: 'telegram.post.success',
      targetType: 'Job',
      targetId: job._id?.toString(),
      metadata: { telegramMessageId: data.result?.message_id },
    });

    return { success: true };
  } catch (err) {
    console.error('Unexpected network error during Telegram broadcast:', err.message);

    await recordAuditLog({
      action: 'telegram.post.network_error',
      targetType: 'Job',
      targetId: job._id?.toString(),
      metadata: { error: err.message },
    });

    return { success: false, error: err.message };
  }
}
