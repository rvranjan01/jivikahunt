/**
 * @file models/Subscriber.js
 * @description Mongoose model for email job alert subscribers with double opt-in verification
 * and RFC-compliant one-click unsubscribe tokens.
 */

import mongoose from 'mongoose';

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    preferences: {
      types: {
        type: [String],
        enum: ['fresher', 'intern', 'experienced'],
        default: ['fresher', 'intern'],
      },
      batches: {
        type: [Number],
        default: [],
      },
    },
    confirmToken: {
      type: String,
      default: null,
      index: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
      index: true,
    },
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastDigestSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscriber =
  mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);

export default Subscriber;
