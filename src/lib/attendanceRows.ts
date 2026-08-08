import type { AttendanceRecord, DayAttendanceRow, Employee } from './types';

export function buildDayRows(
  employees: Employee[],
  records: AttendanceRecord[],
  date: string,
  roleFilter: 'all' | Employee['role']
): DayAttendanceRow[] {
  return employees
    .filter((emp) => (roleFilter === 'all' ? true : emp.role === roleFilter))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => {
      const record =
        records.find((r) => r.employeeId === employee.id && r.date === date) ?? null;
      return {
        employee,
        record,
        status: record ? record.status : 'Not Marked',
      };
    });
}
