export type EmployeeRole =
  | 'BDM'
  | 'BDE'
  | 'Graphic Designer'
  | 'Full Stack Developer'
  | string;

export type AttendanceStatus = 'Present' | 'Absent';

export type Role = {
  _id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
};

export type Employee = {
  id: string;
  name: string;
  contact: string;
  role: EmployeeRole;
  roleId?: string;
  joiningDate: string; // YYYY-MM-DD; empty if not set
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeContact: string;
  employeeRole: EmployeeRole;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  entryTime: string; // HH:mm
  exitTime: string; // HH:mm
  createdAt: string;
};

export type DayAttendanceRow = {
  employee: Employee;
  record: AttendanceRecord | null;
  status: AttendanceStatus | 'Not Marked';
};

export const DEFAULT_EMPLOYEE_ROLES: EmployeeRole[] = [
  'BDM',
  'BDE',
  'Graphic Designer',
  'Full Stack Developer',
];

export const DEFAULT_SYSTEM_ROLES = ['HR', 'Admin', 'Manager'];

export const EMPLOYEE_ROLES = DEFAULT_EMPLOYEE_ROLES;

export const DEFAULT_ENTRY_TIME = '10:00'; // 10:00 AM
export const DEFAULT_EXIT_TIME = '18:30'; // 6:30 PM

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
} as const;

/** Formats HH:mm to 12-hour display, e.g. 10:00 → 10:00 AM */
export function formatTime12h(time: string) {
  if (!time) return '-';
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
