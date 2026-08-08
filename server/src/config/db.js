import mongoose from 'mongoose';
import { env } from './env.js';

const globalForMongoose = globalThis;

if (!globalForMongoose.__nexsahayMongoose) {
  globalForMongoose.__nexsahayMongoose = { conn: null, promise: null };
}

const cached = globalForMongoose.__nexsahayMongoose;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(env.mongoUri).then((connection) => {
      console.log('MongoDB connected');
      return connection;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
