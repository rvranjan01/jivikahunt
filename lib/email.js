/**
 * @file lib/email.js
 * @description Email delivery engine with Resend integration and automatic local development fallback.
 * Allows local development without an active Resend account or verified domain.
 */

import { Resend } from 'resend';
import siteConfig from './siteConfig';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || `${siteConfig.name} <onboarding@resend.dev>`;

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends an email or prints to console in local development mode.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text version
 * @returns {Promise<{ success: boolean, id?: string, simulated?: boolean }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  // If no Resend API key is configured, log the email locally for smooth offline development
  if (!resendClient) {
    console.info('\n' + '='.repeat(60));
    console.info('📫 [LOCAL EMAIL OUTBOX — RESEND UNCONFIGURED]');
    console.info(`To:      ${to}`);
    console.info(`Subject: ${subject}`);
    console.info('-'.repeat(60));
    console.info(text || html.replace(/<[^>]+>/g, ' '));
    console.info('='.repeat(60) + '\n');
    return { success: true, id: `sim_${Date.now()}`, simulated: true };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    });

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Unexpected error during email dispatch:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a welcome invitation email to a newly created contributor containing their temporary password.
 * @param {Object} params
 * @param {string} params.email - Contributor's email
 * @param {string} params.name - Contributor's name
 * @param {string} params.temporaryPassword - Generated temporary password
 * @returns {Promise<{ success: boolean, id?: string, simulated?: boolean }>}
 */
export async function sendContributorInviteEmail({ email, name, temporaryPassword }) {
  const loginUrl = `${siteConfig.url}/admin/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Welcome to ${siteConfig.name}</h2>
      <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.5;">You have been invited as a contributor to post and curate job listings on ${siteConfig.name}.</p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Your Temporary Credentials</p>
        <p style="margin: 0 0 4px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0; font-size: 15px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 16px;">${temporaryPassword}</code></p>
      </div>

      <p style="font-size: 14px; color: #475569;"><em>Note: You will be required to choose a new secure password upon your first login.</em></p>
      
      <div style="margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Log in to Contributor Portal</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">${siteConfig.name} Team · If you did not expect this invitation, please ignore this email.</p>
    </div>
  `;

  const text = `
Welcome to ${siteConfig.name}!

Hello ${name},
You have been invited as a contributor to post job listings on ${siteConfig.name}.

Your Temporary Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

Please log in at: ${loginUrl}
You will be asked to set a new password upon your first login.
  `;

  return sendEmail({
    to: email,
    subject: `You have been invited to ${siteConfig.name}`,
    html,
    text,
  });
}

/**
 * Sends a double opt-in confirmation email for job alert subscribers.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.confirmToken
 * @param {string} params.unsubscribeToken
 * @returns {Promise<{ success: boolean, id?: string, simulated?: boolean }>}
 */
export async function sendSubscriptionConfirmationEmail({ email, confirmToken, unsubscribeToken }) {
  const confirmUrl = `${siteConfig.url}/api/alerts/confirm?token=${confirmToken}`;
  const unsubscribeUrl = `${siteConfig.url}/api/alerts/unsubscribe?token=${unsubscribeToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Confirm Your ${siteConfig.name} Job Alerts</h2>
      <p style="font-size: 15px; line-height: 1.5;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.5;">You recently requested to receive daily email alerts for freshers jobs and internships on <strong>${siteConfig.name}</strong>.</p>
      
      <p style="font-size: 15px; line-height: 1.5;">Please confirm your email address by clicking the button below:</p>

      <div style="margin: 28px 0;">
        <a href="${confirmUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Confirm Job Alerts</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link in your browser:<br/><a href="${confirmUrl}" style="color: #2563eb;">${confirmUrl}</a></p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">
        If you did not request these alerts, you can safely ignore this email or <a href="${unsubscribeUrl}" style="color: #64748b;">unsubscribe immediately</a>.
      </p>
    </div>
  `;

  const text = `
Confirm Your ${siteConfig.name} Job Alerts

Please click the link below to confirm your subscription:
${confirmUrl}

To unsubscribe, visit:
${unsubscribeUrl}
  `;

  return sendEmail({
    to: email,
    subject: `Confirm your job alerts on ${siteConfig.name}`,
    html,
    text,
  });
}

/**
 * Sends a daily digest email containing recent matching job postings to a subscriber.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {Array<Object>} params.jobs
 * @param {string} params.unsubscribeToken
 * @returns {Promise<{ success: boolean, id?: string, simulated?: boolean }>}
 */
export async function sendDailyDigestEmail({ email, jobs, unsubscribeToken }) {
  const unsubscribeUrl = `${siteConfig.url}/api/alerts/unsubscribe?token=${unsubscribeToken}`;

  const jobRows = jobs
    .map(
      (j) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #ffffff;">
        <h3 style="margin: 0 0 4px 0; font-size: 16px;"><a href="${siteConfig.url}/jobs/${j.slug}" style="color: #2563eb; text-decoration: none;">${j.title}</a></h3>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>${j.company?.name}</strong> • ${Array.isArray(j.locations) ? j.locations.join(', ') : j.locations} • <span style="text-transform: capitalize;">${j.type}</span> (${j.workMode})</p>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #334155;">${j.summary ? j.summary.slice(0, 150) + '...' : ''}</p>
        <a href="${j.applyUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none;">Apply on Official Careers Site &rarr;</a>
      </div>
    `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0;">${siteConfig.name} Daily Job Digest</h2>
        <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Verified freshers drives and internships matching your preferences</p>
      </div>

      <div style="margin-bottom: 24px;">
        ${jobRows}
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8;">
        <p>You received this email because you subscribed to daily job alerts on ${siteConfig.name}.</p>
        <p><a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe from alerts with one click</a></p>
      </div>
    </div>
  `;

  const text = `
${siteConfig.name} Daily Job Digest

${jobs.map((j) => `${j.title} at ${j.company?.name}\nLink: ${siteConfig.url}/jobs/${j.slug}\nApply: ${j.applyUrl}\n`).join('\n---\n')}

To unsubscribe from daily alerts, click:
${unsubscribeUrl}
  `;

  return sendEmail({
    to: email,
    subject: `${jobs.length} New Job Openings for Freshers & Interns - ${siteConfig.name}`,
    html,
    text,
  });
}
