import app from '../src/app.js';
import { ensureReady } from '../src/bootstrap.js';

export default async function handler(req, res) {
  try {
    await ensureReady();
  } catch (error) {
    console.error('Failed to initialize API:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect to database',
    });
    return;
  }

  return app(req, res);
}
