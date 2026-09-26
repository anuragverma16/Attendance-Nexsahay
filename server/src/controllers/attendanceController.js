import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { mapAttendance } from '../utils/mapDoc.js';
import { fail, ok } from '../utils/response.js';

export async function getAttendance(req, res) {
  try {
    const filter = {};
    if (typeof req.query.date === 'string' && req.query.date) {
      filter.date = req.query.date;
    }
    if (typeof req.query.employeeId === 'string' && req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }

    const rows = await Attendance.find(filter)
      .sort({ date: -1, employeeName: 1 })
      .lean();
    return ok(res, rows.map(mapAttendance));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch attendance.');
  }
}

export async function upsertAttendance(req, res) {
  try {
    const employeeId = String(req.body?.employeeId || '');
    const date = String(req.body?.date || '');
    const status = String(req.body?.status || '');
    const entryTime = String(req.body?.entryTime || '');
    const exitTime = String(req.body?.exitTime || '');

    const employee = await Employee.findById(employeeId);
    if (!employee) return fail(res, 404, 'Employee not found.');
    if (!date) return fail(res, 400, 'Date is required.');
    if (status !== 'Present' && status !== 'Absent') {
      return fail(res, 400, 'Status must be Present or Absent.');
    }
    if (status === 'Present' && !entryTime) {
      return fail(res, 400, 'Entry time is required for Present.');
    }

    const payload = {
      employeeId: employee._id,
      employeeName: employee.name,
      employeeContact: employee.contact,
      employeeRole: employee.role,
      date,
      status,
      entryTime: status === 'Present' ? entryTime : '',
      exitTime: status === 'Present' ? exitTime : '',
    };

    const record = await Attendance.findOneAndUpdate(
      { employeeId: employee._id, date },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return ok(res, mapAttendance(record));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to save attendance.');
  }
}

export async function updateAttendance(req, res) {
  try {
    const current = await Attendance.findById(req.params.id);
    if (!current) return fail(res, 404, 'Attendance record not found.');

    const employeeId = String(req.body?.employeeId || current.employeeId);
    const employee = await Employee.findById(employeeId);

    const date = String(req.body?.date || current.date);
    const status = String(req.body?.status || current.status);
    const entryTime = String(
      req.body?.entryTime !== undefined ? req.body.entryTime : current.entryTime
    );
    const exitTime = String(
      req.body?.exitTime !== undefined ? req.body.exitTime : current.exitTime
    );

    if (status !== 'Present' && status !== 'Absent') {
      return fail(res, 400, 'Status must be Present or Absent.');
    }

    current.employeeId = employee?._id || current.employeeId;
    current.employeeName = employee?.name || current.employeeName;
    current.employeeContact = employee?.contact || current.employeeContact;
    current.employeeRole = employee?.role || current.employeeRole;
    current.date = date;
    current.status = status;
    current.entryTime = status === 'Present' ? entryTime : '';
    current.exitTime = status === 'Present' ? exitTime : '';

    await current.save();
    return ok(res, mapAttendance(current));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update attendance.');
  }
}

export async function deleteAttendance(req, res) {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return fail(res, 404, 'Attendance record not found.');
    return ok(res, { id: String(record._id) });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete attendance.');
  }
}

export async function getSummary(req, res) {
  try {
    const date = String(req.query.date || '');
    const matchStage = date ? { $match: { date } } : { $match: {} };

    const [employeeCount, summary] = await Promise.all([
      Employee.countDocuments(),
      Attendance.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            records: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] },
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const result = summary[0] || { records: 0, present: 0, absent: 0 };
    return ok(res, {
      employees: employeeCount,
      records: result.records,
      present: result.present,
      absent: result.absent,
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch summary.');
  }
}
