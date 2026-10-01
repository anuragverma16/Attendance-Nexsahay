import { Attendance } from '../models/Attendance.js';

/**
 * Parse HH:mm format time string to minutes since midnight
 */
export function timeStringToMinutes(timeString) {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Determine attendance status based on entry time
 * ≤ 10:15 AM → Present (0 to 615 minutes)
 * > 10:15 AM and < 12:00 PM → Late (616 to 719 minutes)
 * ≥ 12:00 PM → Half Day (720+ minutes)
 */
export function determineAttendanceStatus(entryTimeString) {
  const entryMinutes = timeStringToMinutes(entryTimeString);
  if (entryMinutes === null) return null;

  const cutoffLate = 10 * 60 + 15; // 10:15 AM = 615 minutes
  const cutoffHalfDay = 12 * 60; // 12:00 PM = 720 minutes

  if (entryMinutes <= cutoffLate) {
    return 'Present';
  } else if (entryMinutes < cutoffHalfDay) {
    return 'Late';
  } else {
    return 'Half Day';
  }
}

/**
 * Calculate working hours from entry and exit times
 * Returns: "Xh YYm" format or null if invalid
 */
export function calculateWorkingHours(entryTime, exitTime) {
  if (!entryTime || !exitTime) return null;

  const entryMins = timeStringToMinutes(entryTime);
  const exitMins = timeStringToMinutes(exitTime);

  if (entryMins === null || exitMins === null || exitMins <= entryMins) {
    return null;
  }

  const diffMins = exitMins - entryMins;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Get monthly late count for an employee
 */
export async function getMonthlyLateCount(employeeId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const records = await Attendance.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
    attendanceStatus: 'Late',
  }).lean();

  return records.length;
}

/**
 * Apply late-to-half-day conversion
 * Every 3 late days = 1 half day
 * Returns: { halfDaysFromLate, remainingLateCount }
 */
export function convertLateToHalfDays(totalLateCount) {
  const halfDaysFromLate = Math.floor(totalLateCount / 3);
  const remainingLateCount = totalLateCount % 3;
  return { halfDaysFromLate, remainingLateCount };
}

/**
 * Get or update attendance record with status
 */
export async function upsertAttendanceWithStatus(employeeId, date, entryTime, exitTime) {
  const attendanceStatus = determineAttendanceStatus(entryTime);
  const workingHours = calculateWorkingHours(entryTime, exitTime);

  const update = {
    entryTime,
    exitTime,
    attendanceStatus,
    workingHours: workingHours || '',
    status: 'Present', // Keep for backward compatibility
  };

  const record = await Attendance.findOneAndUpdate(
    { employeeId, date },
    update,
    { new: true, upsert: false }
  ).lean();

  return record;
}
