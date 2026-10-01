import mongoose from 'mongoose';
import { env } from './env.js';

const globalForMongoose = globalThis;

if (!globalForMongoose.__nexsahayMongoose) {
  globalForMongoose.__nexsahayMongoose = { conn: null, promise: null };
}

const cached = globalForMongoose.__nexsahayMongoose;

function assertCloudMongoUri() {
  const uri = env.mongoUri || '';

  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables.');
  }

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
  // Return cached connection if exists
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  assertCloudMongoUri();

  // Create new connection promise if doesn't exist
  if (!cached.promise) {
    console.log('Establishing new MongoDB connection...');
    mongoose.set('strictQuery', true);

    // Connection options
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    };

    cached.promise = mongoose.connect(env.mongoUri, options)
      .then((connection) => {
        console.log('✓ MongoDB connected successfully');

        // Log connection details
        console.log(`Database: ${connection.connection.db.databaseName}`);
        console.log(`Host: ${connection.connection.host}`);

        return connection;
      })
      .catch((error) => {
        console.error('✗ MongoDB connection failed:', error.message);
        cached.promise = null;
        throw error;
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

// Connection error handling
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
