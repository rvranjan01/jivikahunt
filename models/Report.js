/**
 * @file models/Report.js
 * @description Mongoose model for public user reports regarding broken application links,
 * expired job postings, scam opportunities, or incorrect job details.
 */

import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: ['broken_link', 'expired', 'scam', 'other'],
      required: [true, 'Report reason is required'],
      index: true,
    },
    note: {
      type: String,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
      trim: true,
    },
    ipHash: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for administrative moderation queries
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ jobId: 1, status: 1 });

export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);

export default Report;
