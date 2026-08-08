import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { seedDatabase } from './utils/seedData.js';
import mongoose from 'mongoose';

async function run() {
  try {
    await connectDB();
    const result = await seedDatabase();
    console.log(
      `Seeded ${result.employees} employees and ${result.attendance} attendance records.`
    );
    console.log(`Admin login: ${env.adminUsername} / ${env.adminPassword}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error('Start MongoDB first, then run: npm run seed');
    process.exit(1);
  }
}

run();
