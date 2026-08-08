import app from '../src/app.js';
import { ensureReady } from '../src/bootstrap.js';
import { applyCorsHeaders } from '../src/config/cors.js';

export default async function handler(req, res) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    await ensureReady();
  } catch (error) {
    console.error('Failed to initialize API:', error);
    const message =
      error.message?.includes('ECONNREFUSED') || error.message?.includes('127.0.0.1')
        ? 'Database unavailable. Set MONGODB_URI to a MongoDB Atlas connection string in the Vercel server project env vars.'
        : error.message || 'Failed to connect to database';

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ success: false, message }));
    return;
  }

  return app(req, res);
}
