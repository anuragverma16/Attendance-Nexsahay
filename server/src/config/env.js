import dotenv from 'dotenv';

dotenv.config();

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexsahay_attendance',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  clientOrigins: parseOrigins(
    process.env.CLIENT_ORIGIN ||
      'http://localhost:5173,http://127.0.0.1:5173,https://attendance-nexsahay26.vercel.app'
  ),
};
