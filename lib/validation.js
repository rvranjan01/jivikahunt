/**
 * @file lib/validation.js
 * @description Centralized Zod validation schemas for requests, user forms, authentication, and job postings.
 */

import { z } from 'zod';

const BLOCKED_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'buff.ly',
  'is.gd',
  'cutt.ly',
  'rb.gy',
  'shorturl.at',
  'tiny.cc',
  'rebrand.ly',
  'bl.ink',
  'v.gd',
  'qr.ae',
  'adf.ly',
  'bit.do',
];

/**
 * Validates that a string is a genuine, full HTTPS destination URL without credentials or shorteners.
 * @param {string} urlStr
 * @returns {boolean}
 */
export function isValidApplyUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;

    const hostname = parsed.hostname.toLowerCase();
    const isShortener = BLOCKED_SHORTENERS.some(
      (shortener) => hostname === shortener || hostname.endsWith(`.${shortener}`)
    );

    return !isShortener;
  } catch (err) {
    return false;
  }
}

export const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email address')
      .trim()
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(
        MIN_PASSWORD_LENGTH,
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      )
      .max(100, 'Password is too long')
      .refine(
        (val) => /[A-Za-z]/.test(val) && /[0-9]/.test(val),
        'Password must contain both letters and at least one number'
      ),
  })
  .strict();

export const createContributorSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    displayName: z
      .string({ required_error: 'Display name is required' })
      .trim()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email address')
      .trim()
      .toLowerCase(),
    bio: z.string().max(250, 'Bio cannot exceed 250 characters').optional().default(''),
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    displayName: z
      .string({ required_error: 'Display name is required' })
      .trim()
      .min(2, 'Display name must be between 2 and 40 characters')
      .max(40, 'Display name must be between 2 and 40 characters'),
    bio: z.string().max(250, 'Bio cannot exceed 250 characters').optional().default(''),
    photoId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid photo ID')
      .nullable()
      .optional(),
  })
  .strict();

export const updateContributorSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    displayName: z.string().trim().min(2).max(100).optional(),
    bio: z.string().max(250).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const BANNED_TITLE_PHRASES = ['hiring now', 'apply now', 'walk-in', 'urgent'];

export const jobSchema = z
  .object({
    title: z
      .string({ required_error: 'Job title is required' })
      .trim()
      .min(3, 'Job title must be at least 3 characters')
      .max(100, 'Job title cannot exceed 100 characters')
      .refine(
        (t) => {
          const letters = t.replace(/[^a-zA-Z]/g, '');
          return !(letters.length > 3 && letters === letters.toUpperCase());
        },
        { message: 'Job title cannot be all uppercase' }
      )
      .refine((t) => (t.match(/!/g) || []).length <= 1, {
        message: 'Job title cannot contain more than one exclamation mark',
      })
      .refine(
        (t) => {
          const lower = t.toLowerCase();
          return !BANNED_TITLE_PHRASES.some((phrase) => lower.includes(phrase));
        },
        {
          message:
            'Job title cannot contain promotional or urgency phrases like "hiring now", "apply now", "walk-in", or "urgent"',
        }
      ),
    company: z.object({
      name: z
        .string({ required_error: 'Company name is required' })
        .trim()
        .min(2, 'Company name must be at least 2 characters')
        .max(100, 'Company name cannot exceed 100 characters'),
      logoId: z.string().nullable().optional().or(z.literal('')),
      description: z
        .string()
        .max(1000, 'Company description cannot exceed 1000 characters')
        .optional()
        .default(''),
    }),
    type: z.enum(['fresher', 'intern', 'experienced'], {
      required_error: 'Please select a job type (Fresher, Intern, or Experienced)',
    }),
    workMode: z.enum(['onsite', 'hybrid', 'remote'], {
      required_error: 'Please select a work mode (Onsite, Hybrid, or Remote)',
    }),
    locations: z.array(z.string().trim()).min(1, 'Please provide at least one location'),
    batches: z.array(z.number().int().min(2000).max(2100)).optional().default([]),
    salary: z.string().max(100, 'Salary cannot exceed 100 characters').optional().default(''),
    skills: z.array(z.string().trim()).optional().default([]),
    summary: z
      .string({ required_error: 'Summary is required' })
      .trim()
      .min(40, 'Summary must be at least 40 characters long')
      .max(2000, 'Summary cannot exceed 2000 characters'),
    responsibilities: z.array(z.string().trim()).optional().default([]),
    eligibility: z.array(z.string().trim()).optional().default([]),
    applyUrl: z
      .string({ required_error: 'Official apply link is required' })
      .trim()
      .refine(isValidApplyUrl, {
        message:
          'Apply URL must be a valid HTTPS link with no credentials. URL shorteners are strictly blocked.',
      }),
    lastDate: z.string().nullable().optional().or(z.literal('')),
    status: z.enum(['draft', 'scheduled', 'published', 'unpublished']).default('draft'),
    publishAt: z.string().nullable().optional().or(z.literal('')),
    featured: z.boolean().optional().default(false),
    confirmLiveJob: z.boolean().optional(),
    confirmOfficialSite: z.boolean().optional(),
    confirmedLiveLink: z.boolean().optional(),
    confirmNoPayment: z.boolean().optional(),
    confirmedNoPayment: z.boolean().optional(),
    confirmRealJob: z.boolean().optional(),
    confirmedRealJob: z.boolean().optional(),
    publishChecklist: z
      .object({
        confirmedLiveLink: z.boolean().optional(),
        confirmedNoPayment: z.boolean().optional(),
        confirmedRealJob: z.boolean().optional(),
      })
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Title rule: company name must not be inside title
    if (data.company?.name && data.title) {
      const companyName = data.company.name.trim();
      if (companyName.length >= 2) {
        const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
        if (regex.test(data.title)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Job title must not include the company name',
            path: ['title'],
          });
        }
      }
    }

    // Publish-time rules (drafts exempt)
    if (data.status !== 'draft') {
      if (!data.summary || data.summary.trim().length < 150) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Summary must be at least 150 characters when publishing',
          path: ['summary'],
        });
      }

      const validResponsibilities = (data.responsibilities || []).filter(
        (r) => typeof r === 'string' && r.trim().length > 0
      );
      if (validResponsibilities.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least 2 responsibilities are required when publishing',
          path: ['responsibilities'],
        });
      }

      const validEligibility = (data.eligibility || []).filter(
        (e) => typeof e === 'string' && e.trim().length > 0
      );
      if (validEligibility.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least 2 eligibility points are required when publishing',
          path: ['eligibility'],
        });
      }

      const hasLiveConfirm =
        data.confirmLiveJob === true ||
        data.confirmOfficialSite === true ||
        data.confirmedLiveLink === true ||
        data.publishChecklist?.confirmedLiveLink === true;
      if (!hasLiveConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "You must confirm that you opened the apply link and it is a live job on the company's official site",
          path: ['confirmedLiveLink'],
        });
      }

      const hasNoPaymentConfirm =
        data.confirmNoPayment === true ||
        data.confirmedNoPayment === true ||
        data.publishChecklist?.confirmedNoPayment === true;
      if (!hasNoPaymentConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'You must confirm that this job does not ask applicants for any payment or deposit',
          path: ['confirmedNoPayment'],
        });
      }

      const hasRealJobConfirm =
        data.confirmRealJob === true ||
        data.confirmedRealJob === true ||
        data.publishChecklist?.confirmedRealJob === true;
      if (!hasRealJobConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'You must confirm that this is a real open job, not an event, walk-in drive or resume collection',
          path: ['confirmedRealJob'],
        });
      }
    }
  });

export const publicJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['fresher', 'intern', 'experienced']).optional().or(z.literal('')),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).optional().or(z.literal('')),
  batch: z.coerce.number().int().min(2000).max(2100).optional(),
  location: z.string().trim().max(100).optional().or(z.literal('')),
  skills: z.string().trim().max(100).optional().or(z.literal('')),
  q: z.string().trim().max(100).optional().or(z.literal('')),
});

export const createReportSchema = z
  .object({
    jobId: z.string({ required_error: 'Job ID is required' }).trim().min(1, 'Job ID is required'),
    reason: z.enum(['broken_link', 'expired', 'scam', 'other'], {
      required_error: 'Please select a reason for reporting',
    }),
    note: z.string().trim().max(300, 'Note cannot exceed 300 characters').optional().default(''),
  })
  .strict();

export const updateReportSchema = z
  .object({
    status: z.enum(['open', 'resolved'], {
      required_error: 'Report status must be either open or resolved',
    }),
  })
  .strict();

export const subscribeSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required' })
      .email('Please enter a valid email address')
      .trim()
      .toLowerCase(),
    types: z
      .array(z.enum(['fresher', 'intern', 'experienced']))
      .optional()
      .default(['fresher', 'intern']),
    batches: z.array(z.number().int().min(2000).max(2100)).optional().default([]),
  })
  .strict();

export const guideSchema = z
  .object({
    title: z
      .string({ required_error: 'Guide title is required' })
      .trim()
      .min(5, 'Guide title must be at least 5 characters long')
      .max(150, 'Guide title cannot exceed 150 characters'),
    summary: z
      .string({ required_error: 'Summary is required' })
      .trim()
      .min(30, 'Summary must be at least 30 characters long')
      .max(500, 'Summary cannot exceed 500 characters'),
    body: z
      .string({ required_error: 'Guide content (markdown) is required' })
      .trim()
      .min(50, 'Guide body must be at least 50 characters long'),
    status: z.enum(['draft', 'published']).default('draft'),
  })
  .strict();
