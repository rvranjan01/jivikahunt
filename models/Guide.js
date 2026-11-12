/**
 * @file models/Guide.js
 * @description Mongoose model for career guides, interview preparation resources, and placement roadmaps.
 */

import mongoose from 'mongoose';

const GuideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Guide title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true,
      minlength: [30, 'Summary must be at least 30 characters'],
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },
    body: {
      type: String,
      required: [true, 'Markdown body is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    postedByName: {
      type: String,
      required: true,
      trim: true,
    },
    readingTime: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

GuideSchema.index({ status: 1, createdAt: -1 });

export const Guide = mongoose.models.Guide || mongoose.model('Guide', GuideSchema);

export default Guide;
