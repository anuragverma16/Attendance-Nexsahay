import mongoose from 'mongoose';
import { env } from './env.js';

const globalForMongoose = globalThis;

if (!globalForMongoose.__nexsahayMongoose) {
  globalForMongoose.__nexsahayMongoose = { conn: null, promise: null };
}

const cached = globalForMongoose.__nexsahayMongoose;

function assertCloudMongoUri() {
  const uri = env.mongoUri || '';
  const isLocal =
    uri.includes('127.0.0.1') ||
    uri.includes('localhost') ||
    uri.startsWith('mongodb://127.');

  // Vercel serverless cannot reach your laptop MongoDB
  if (process.env.VERCEL && isLocal) {
    throw new Error(
      'MONGODB_URI points to localhost. On Vercel, set MONGODB_URI to a MongoDB Atlas URI (mongodb+srv://...).'
    );
  }
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  assertCloudMongoUri();

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(env.mongoUri).then((connection) => {
      console.log('MongoDB connected');
      return connection;
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
