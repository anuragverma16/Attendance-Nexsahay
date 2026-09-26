import { Attendance } from '../models/Attendance.js';
import { Employee, EMPLOYEE_ROLES } from '../models/Employee.js';
import { Role } from '../models/Role.js';
import { mapEmployee } from '../utils/mapDoc.js';
import { fail, ok } from '../utils/response.js';

const JOINING_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseJoiningDate(value) {
  const joiningDate = String(value || '').trim();
  if (joiningDate && !JOINING_DATE_RE.test(joiningDate)) {
    throw new Error('Joining date must be in YYYY-MM-DD format.');
  }
  return joiningDate;
}

export async function getEmployees(_req, res) {
  try {
    const employees = await Employee.find().sort({ name: 1 }).lean();
    return ok(res, employees.map(mapEmployee));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch employees.');
  }
}

export async function createEmployee(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const contact = String(req.body?.contact || '').trim();
    const role = String(req.body?.role || '').trim();

    if (!name || !contact || !role) {
      return fail(res, 400, 'Name, contact and role are required.');
    }
    if (!/^\d{10}$/.test(contact)) {
      return fail(res, 400, 'Contact number must be 10 digits.');
    }

    const validRole = await Role.findOne({ name: role }).lean();
    if (!validRole && !EMPLOYEE_ROLES.includes(role)) {
      return fail(res, 400, 'Invalid employee role.');
    }

    let joiningDate;
    try {
      joiningDate = parseJoiningDate(req.body?.joiningDate);
    } catch (error) {
      return fail(res, 400, error.message);
    }

    const employee = await Employee.create({ name, contact, role, joiningDate });
    return ok(res, mapEmployee(employee));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to create employee.');
  }
}

export async function updateEmployee(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const contact = String(req.body?.contact || '').trim();
    const role = String(req.body?.role || '').trim();

    if (!name || !contact || !role) {
      return fail(res, 400, 'Name, contact and role are required.');
    }
    if (!/^\d{10}$/.test(contact)) {
      return fail(res, 400, 'Contact number must be 10 digits.');
    }

    const validRole = await Role.findOne({ name: role }).lean();
    if (!validRole && !EMPLOYEE_ROLES.includes(role)) {
      return fail(res, 400, 'Invalid employee role.');
    }

    let joiningDate;
    try {
      joiningDate = parseJoiningDate(req.body?.joiningDate);
    } catch (error) {
      return fail(res, 400, error.message);
    }

    const update = { name, contact, role };
    if (joiningDate) update.joiningDate = joiningDate;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!employee) return fail(res, 404, 'Employee not found.');

    await Attendance.updateMany(
      { employeeId: employee._id },
      {
        employeeName: name,
        employeeContact: contact,
        employeeRole: role,
      }
    );

    return ok(res, mapEmployee(employee));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update employee.');
  }
}

export async function deleteEmployee(req, res) {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return fail(res, 404, 'Employee not found.');
    // Keep attendance history for reporting
    return ok(res, { id: String(employee._id) });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete employee.');
  }
}
