import { connectDB } from './config/db.js';
import { Admin } from './models/Admin.js';
import { Employee } from './models/Employee.js';
import { seedDatabase } from './utils/seedData.js';
import { initializeDefaultRoles } from './controllers/roleController.js';

let readyPromise = null;

export async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDB();

      await initializeDefaultRoles();

      const [employeeCount, adminCount] = await Promise.all([
        Employee.countDocuments(),
        Admin.countDocuments(),
      ]);

      if (employeeCount === 0 || adminCount === 0) {
        const seeded = await seedDatabase();
        console.log(
          `MongoDB seeded: ${seeded.employees} employees, ${seeded.attendance} attendance records.`
        );
      }
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  return readyPromise;
}
