import { Admin } from '../models/Admin.js';
import { env } from '../config/env.js';
import { fail, ok } from '../utils/response.js';

export async function login(req, res) {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    let admin = await Admin.findOne({ username });
    if (!admin) {
      // Fallback to env credentials and auto-create admin
      if (username === env.adminUsername && password === env.adminPassword) {
        admin = await Admin.create({
          username: env.adminUsername,
          password: env.adminPassword,
        });
      }
    }

    if (!admin || admin.password !== password) {
      return fail(res, 401, 'Invalid admin username or password.');
    }

    return ok(res, { token: 'admin-session', username: admin.username });
  } catch (error) {
    return fail(res, 500, error.message || 'Login failed.');
  }
}
