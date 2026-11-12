/**
 * @file models/Job.js
 * @description Mongoose model for JivikaHunt job postings, company profiles, and application links.
 */

import mongoose from 'mongoose';

const CompanySubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    logoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      default: null,
    },
    description: {
      type: String,
      maxlength: [1000, 'Company description cannot exceed 1000 characters'],
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [120, 'Job title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    company: {
      type: CompanySubSchema,
      required: true,
    },
    type: {
      type: String,
      enum: ['fresher', 'intern', 'experienced'],
      required: [true, 'Job type is required'],
      index: true,
    },
    workMode: {
      type: String,
      enum: ['onsite', 'hybrid', 'remote'],
      required: [true, 'Work mode is required'],
      index: true,
    },
    locations: {
      type: [String],
      required: [true, 'At least one location is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one location is required',
      },
    },
    batches: {
      type: [Number],
      default: [],
      index: true,
    },
    salary: {
      type: String,
      maxlength: [100, 'Salary cannot exceed 100 characters'],
      default: '',
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      minlength: [40, 'Summary must be at least 40 characters long'],
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
      trim: true,
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: [String],
      default: [],
    },
    applyUrl: {
      type: String,
      required: [true, 'Official apply URL is required'],
      trim: true,
    },
    lastDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'unpublished'],
      default: 'draft',
      index: true,
    },
    publishAt: {
      type: Date,
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

// Compound and Search Indexes per AGENTS.md specification
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ status: 1, type: 1 });
JobSchema.index({ status: 1, workMode: 1 });
JobSchema.index({ status: 1, batches: 1 });
JobSchema.index({ status: 1, skills: 1 });
JobSchema.index({ 'company.slug': 1, status: 1 });
JobSchema.index({ title: 'text', 'company.name': 'text' });

export const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);

export default Job;
