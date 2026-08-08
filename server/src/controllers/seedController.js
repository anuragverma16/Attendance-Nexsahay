import { seedDatabase } from '../utils/seedData.js';
import { fail, ok } from '../utils/response.js';

export async function seed(_req, res) {
  try {
    const result = await seedDatabase();
    return ok(res, {
      employees: result.employees,
      attendance: result.attendance,
      message: 'Sample MongoDB data restored.',
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to seed database.');
  }
}
