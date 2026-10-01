import { connectDB } from './config/db.js';
import { Admin } from './models/Admin.js';
import { Employee } from './models/Employee.js';
import { seedDatabase } from './utils/seedData.js';
import { initializeDefaultRoles } from './controllers/roleController.js';

let readyPromise = null;

export async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        // 1. Connect to database
        console.log('[Bootstrap] Connecting to MongoDB...');
        await connectDB();
        console.log('[Bootstrap] ✓ Database connected');

        // 2. Initialize roles
        console.log('[Bootstrap] Initializing default roles...');
        await initializeDefaultRoles();
        console.log('[Bootstrap] ✓ Roles initialized');

        // 3. Check if data needs seeding
        console.log('[Bootstrap] Checking data...');
        const [employeeCount, adminCount] = await Promise.all([
          Employee.countDocuments(),
          Admin.countDocuments(),
        ]);

        console.log(`[Bootstrap] Current data: ${employeeCount} employees, ${adminCount} admins`);

        if (employeeCount === 0 || adminCount === 0) {
          console.log('[Bootstrap] Seeding database...');
          const seeded = await seedDatabase();
          console.log(
            `[Bootstrap] ✓ Database seeded: ${seeded.employees} employees, ${seeded.attendance} attendance records.`
          );
        } else {
          console.log('[Bootstrap] ✓ Database already has data');
        }

        console.log('[Bootstrap] ✓ All systems ready!');
      } catch (error) {
        console.error('[Bootstrap] ✗ Initialization failed:', error.message);
        readyPromise = null;
        throw error;
      }
    })();
  }

  return readyPromise;
}
