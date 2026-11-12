/**
 * @file models/User.js
 * @description Mongoose model for JivikaHunt system users (Admins & Contributors).
 */

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'contributor'],
      default: 'contributor',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 1,
    },
    totpSecret: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [250, 'Bio cannot exceed 250 characters'],
      default: '',
      trim: true,
    },
    photoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model across hot reloads in Next.js development
export const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
