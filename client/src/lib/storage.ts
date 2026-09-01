import type { AttendanceRecord, AttendanceStatus, Employee, EmployeeRole } from './types';
import { EMPLOYEE_ROLES } from './types';

const KEYS = {
  employees: 'attendance_employees_v2',
  records: 'attendance_records_v3',
  session: 'attendance_admin_session',
  theme: 'nexsahay_theme',
} as const;

export type ThemeMode = 'light' | 'dark';

const LEGACY = {
  employees: 'attendance_employees',
  recordsV2: 'attendance_records_v2',
  records: 'attendance_records',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isRole(value: unknown): value is EmployeeRole {
  return typeof value === 'string' && (EMPLOYEE_ROLES as string[]).includes(value);
}

function isStatus(value: unknown): value is AttendanceStatus {
  return value === 'Present' || value === 'Absent';
}

function normalizeEmployee(raw: Record<string, unknown>): Employee | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const roleRaw = raw.role ?? raw.type;
  const role = isRole(roleRaw) ? roleRaw : 'BDE';
  return {
    id: raw.id,
    name: raw.name,
    contact: typeof raw.contact === 'string' ? raw.contact : '',
    role,
    joiningDate: typeof raw.joiningDate === 'string' ? raw.joiningDate : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

function normalizeRecord(raw: Record<string, unknown>): AttendanceRecord | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.employeeId !== 'string' ||
    typeof raw.employeeName !== 'string' ||
    typeof raw.date !== 'string'
  ) {
    return null;
  }

  const roleRaw = raw.employeeRole ?? raw.employeeType;
  const role = isRole(roleRaw) ? roleRaw : 'BDE';
  const entryTime = typeof raw.entryTime === 'string' ? raw.entryTime : '';
  const exitTime = typeof raw.exitTime === 'string' ? raw.exitTime : '';
  const status = isStatus(raw.status) ? raw.status : entryTime ? 'Present' : 'Absent';

  return {
    id: raw.id,
    employeeId: raw.employeeId,
    employeeName: raw.employeeName,
    employeeContact: typeof raw.employeeContact === 'string' ? raw.employeeContact : '',
    employeeRole: role,
    date: raw.date,
    status,
    entryTime: status === 'Present' ? entryTime : '',
    exitTime: status === 'Present' ? exitTime : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

export function getEmployees(): Employee[] {
  const current = readJson<unknown[]>(KEYS.employees, []);
  if (current.length) {
    return current
      .map((item) => normalizeEmployee(item as Record<string, unknown>))
      .filter((e): e is Employee => Boolean(e));
  }

  const legacy = readJson<unknown[]>(LEGACY.employees, []);
  const migrated = legacy
    .map((item) => normalizeEmployee(item as Record<string, unknown>))
    .filter((e): e is Employee => Boolean(e));
  if (migrated.length) saveEmployees(migrated);
  return migrated;
}

export function saveEmployees(employees: Employee[]) {
  writeJson(KEYS.employees, employees);
}

export function getRecords(): AttendanceRecord[] {
  const current = readJson<unknown[]>(KEYS.records, []);
  if (current.length) {
    return current
      .map((item) => normalizeRecord(item as Record<string, unknown>))
      .filter((r): r is AttendanceRecord => Boolean(r));
  }

  const legacy =
    readJson<unknown[]>(LEGACY.recordsV2, []).length > 0
      ? readJson<unknown[]>(LEGACY.recordsV2, [])
      : readJson<unknown[]>(LEGACY.records, []);

  const migrated = legacy
    .map((item) => normalizeRecord(item as Record<string, unknown>))
    .filter((r): r is AttendanceRecord => Boolean(r));
  if (migrated.length) saveRecords(migrated);
  return migrated;
}

export function saveRecords(records: AttendanceRecord[]) {
  writeJson(KEYS.records, records);
}

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(KEYS.session) === 'true';
}

export function setAdminSession(loggedIn: boolean) {
  if (loggedIn) localStorage.setItem(KEYS.session, 'true');
  else localStorage.removeItem(KEYS.session);
}

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(KEYS.theme);
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

export function setTheme(theme: ThemeMode) {
  localStorage.setItem(KEYS.theme, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function applyStoredTheme() {
  setTheme(getTheme());
}

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
