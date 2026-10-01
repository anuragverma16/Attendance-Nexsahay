import type { AttendanceRecord, AttendanceStatus, Employee, EmployeeRole, Role } from './types';

const API_BASE = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error('Invalid server response.');
  }

  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }

  return body.data as T;
}

export async function apiHealth() {
  return request<{ status: string }>('/health');
}

export async function apiLogin(username: string, password: string) {
  return request<{ token: string; username: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function apiGetEmployees() {
  return request<Employee[]>('/employees');
}

export async function apiCreateEmployee(input: {
  name: string;
  contact: string;
  role: EmployeeRole;
  joiningDate?: string;
}) {
  return request<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateEmployee(
  id: string,
  input: { name: string; contact: string; role: EmployeeRole; joiningDate?: string }
) {
  return request<Employee>(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function apiDeleteEmployee(id: string) {
  return request<{ id: string }>(`/employees/${id}`, { method: 'DELETE' });
}

export async function apiGetAttendance() {
  return request<AttendanceRecord[]>('/attendance');
}

export async function apiUpsertAttendance(input: {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  entryTime?: string;
  exitTime?: string;
}) {
  return request<AttendanceRecord>('/attendance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateAttendance(
  id: string,
  input: {
    employeeId?: string;
    date?: string;
    status?: AttendanceStatus;
    entryTime?: string;
    exitTime?: string;
  }
) {
  return request<AttendanceRecord>(`/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function apiDeleteAttendance(id: string) {
  return request<{ id: string }>(`/attendance/${id}`, { method: 'DELETE' });
}

export async function apiPunchOut(input: {
  employeeId: string;
  date: string;
  exitTime: string;
}) {
  return request<AttendanceRecord>('/attendance/punch-out', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiMarkLeave(input: {
  employeeId: string;
  date: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Paid Leave' | 'Unpaid Leave' | 'Other';
  leaveReason?: string;
}) {
  return request<AttendanceRecord>('/attendance/mark-leave', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiSeed() {
  return request<{ employees: number; attendance: number; message: string }>('/seed', {
    method: 'POST',
  });
}

export async function apiGetRoles() {
  return request<Role[]>('/roles');
}

export async function apiCreateRole(input: { name: string; description?: string; isDefault?: boolean }) {
  return request<Role>('/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateRole(id: string, input: { name?: string; description?: string; isDefault?: boolean }) {
  return request<Role>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function apiDeleteRole(id: string) {
  return request<{ message: string }>(`/roles/${id}`, { method: 'DELETE' });
}
