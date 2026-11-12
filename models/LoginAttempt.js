/**
 * @file models/LoginAttempt.js
 * @description Mongoose model for tracking failed login attempts per IP and per email.
 * Uses a MongoDB TTL index to automatically purge expired records.
 */

import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically deletes document at expiresAt
    },
  },
  {
    timestamps: true,
  }
);

export const LoginAttempt =
  mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema);

export default LoginAttempt;
