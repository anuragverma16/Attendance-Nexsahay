import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { mapAttendance } from '../utils/mapDoc.js';
import { fail, ok } from '../utils/response.js';
import {
  determineAttendanceStatus,
  calculateWorkingHours,
  getMonthlyLateCount,
  convertLateToHalfDays,
} from '../utils/attendanceUtils.js';

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
    const entryTime = String(req.body?.entryTime || '');
    const exitTime = String(req.body?.exitTime || '');
    const status = String(req.body?.status || 'Present');

    if (!date) return fail(res, 400, 'Date is required.');
    if (!entryTime) return fail(res, 400, 'Entry time is required.');

    const employee = await Employee.findById(employeeId).select(
      'name contact role'
    ).lean();
    if (!employee) return fail(res, 404, 'Employee not found.');

    // Determine attendance status based on entry time (IST)
    const attendanceStatus = determineAttendanceStatus(entryTime);
    const workingHours = calculateWorkingHours(entryTime, exitTime);

    const payload = {
      employeeId: employeeId,
      employeeName: employee.name,
      employeeContact: employee.contact,
      employeeRole: employee.role,
      date,
      status: 'Present', // Keep for backward compatibility
      attendanceStatus,
      entryTime,
      exitTime,
      workingHours: workingHours || '',
      punchedOut: !!exitTime,
    };

    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: false }
    ).lean();

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

export async function punchOut(req, res) {
  try {
    const employeeId = String(req.body?.employeeId || '');
    const date = String(req.body?.date || '');
    const exitTime = String(req.body?.exitTime || '');

    if (!employeeId || !date || !exitTime) {
      return fail(res, 400, 'Employee ID, date, and exit time are required.');
    }

    const record = await Attendance.findOne({ employeeId, date });
    if (!record) {
      return fail(res, 404, 'No punch-in record found for this employee today.');
    }

    if (record.punchedOut) {
      return fail(res, 400, 'Already punched out today.');
    }

    const workingHours = calculateWorkingHours(record.entryTime, exitTime);

    const updated = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        exitTime,
        workingHours: workingHours || '',
        punchedOut: true,
      },
      { new: true }
    ).lean();

    return ok(res, mapAttendance(updated));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to punch out.');
  }
}

export async function markLeave(req, res) {
  try {
    const employeeId = String(req.body?.employeeId || '');
    const date = String(req.body?.date || '');
    const leaveType = String(req.body?.leaveType || '');
    const leaveReason = String(req.body?.leaveReason || '');

    if (!employeeId || !date || !leaveType) {
      return fail(res, 400, 'Employee ID, date, and leave type are required.');
    }

    const validLeaveTypes = ['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave', 'Other'];
    if (!validLeaveTypes.includes(leaveType)) {
      return fail(res, 400, 'Invalid leave type.');
    }

    const employee = await Employee.findById(employeeId).select('name contact role').lean();
    if (!employee) return fail(res, 404, 'Employee not found.');

    const updated = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        employeeName: employee.name,
        employeeContact: employee.contact,
        employeeRole: employee.role,
        attendanceStatus: 'Leave',
        leaveType,
        leaveReason,
        leaveApproved: true,
        entryTime: '',
        exitTime: '',
        workingHours: '',
        punchedOut: false,
      },
      { new: true, upsert: true }
    ).lean();

    return ok(res, mapAttendance(updated));
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to mark leave.');
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
