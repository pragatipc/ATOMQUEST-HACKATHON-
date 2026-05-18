import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: MONGODB_URI');
}

// Create a cached connection to avoid repeated reconnections
let cached = global as any;

if (!cached.mongoClient) {
  cached.mongoClient = { connection: null };
}

export async function dbConnect() {
  if (cached.mongoClient.connection) {
    return cached.mongoClient.connection;
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });

    cached.mongoClient.connection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function dbDisconnect() {
  if (cached.mongoClient.connection) {
    await mongoose.disconnect();
    cached.mongoClient.connection = null;
  }
}
