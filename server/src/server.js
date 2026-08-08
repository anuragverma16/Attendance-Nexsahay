import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { Admin } from './models/Admin.js';
import { Employee } from './models/Employee.js';
import { seedDatabase } from './utils/seedData.js';

async function start() {
  try {
    await connectDB();

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

    app.listen(env.port, () => {
      console.log(`Nexsahay Attendance API running at http://localhost:${env.port}`);
      console.log(`MongoDB URI: ${env.mongoUri}`);
      console.log(`Admin: ${env.adminUsername} / ${env.adminPassword}`);
    });
  } catch (error) {
    console.error('Failed to start server.');
    console.error(error.message);
    console.error(
      'Make sure MongoDB is running, or set MONGODB_URI in backend/.env (local or Atlas).'
    );
    process.exit(1);
  }
}

start();
