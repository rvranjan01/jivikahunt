/**
 * @file models/Image.js
 * @description Mongoose model for in-database WebP image storage.
 * Stores binary buffer data directly in MongoDB to survive ephemeral dyno restarts on Heroku.
 */

import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      required: true,
      default: 'image/webp',
    },
    data: {
      type: Buffer,
      required: [true, 'Binary image data is required'],
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ImageSchema.index({ createdAt: -1 });

export const Image = mongoose.models.Image || mongoose.model('Image', ImageSchema);

export default Image;
