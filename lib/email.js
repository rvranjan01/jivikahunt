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
