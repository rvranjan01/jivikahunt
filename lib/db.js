/**
 * @file lib/db.js
 * @description Cached Mongoose connection manager for Next.js App Router.
 * Maintains a singleton connection promise across hot-reloads and route handler invocations
 * to prevent exhausting MongoDB Atlas connection pools.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global cache declaration to persist connection across hot module reloads in development.
 * @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null }}
 */
// @ts-ignore
let cached = global.mongoose;

if (!cached) {
  // @ts-ignore
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB Atlas using cached connection if available.
 * @returns {Promise<typeof mongoose>} Active Mongoose instance
 * @throws {Error} If MONGODB_URI environment variable is not defined
 */
export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not defined. Please set it in your environment or .env.local file.'
    );
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
