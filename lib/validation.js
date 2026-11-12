/**
 * @file lib/validation.js
 * @description Centralized Zod validation schemas for requests, user forms, and authentication.
 */

import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    totpCode: z.string().trim().optional().or(z.literal('')),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long')
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

export const updateContributorSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    displayName: z.string().trim().min(2).max(100).optional(),
    bio: z.string().max(250).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
