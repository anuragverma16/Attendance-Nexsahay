import app from './app.js';
import { ensureReady } from './bootstrap.js';
import { env } from './config/env.js';

async function start() {
  try {
    await ensureReady();

    app.listen(env.port, () => {
      console.log(`Nexsahay Attendance API running at http://localhost:${env.port}`);
      console.log(`MongoDB URI: ${env.mongoUri}`);
      console.log(`Admin: ${env.adminUsername} / ${env.adminPassword}`);
      console.log(`Allowed client origins: ${env.clientOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start server.');
    console.error(error.message);
    console.error(
      'Make sure MongoDB is running, or set MONGODB_URI in server/.env (local or Atlas).'
    );
    process.exit(1);
  }
}

start();
