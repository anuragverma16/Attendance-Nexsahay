import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import logoMark from '@/assets/nexsahay-logo.png';
import {
  MONTH_OPTIONS,
  formatDisplayDate,
  getMonthRange,
  getWeekRange,
  getYear,
  parseISODate,
} from '@/lib/dateRanges';
import {
  buildDayRows,
  buildEmployeeMonthRows,
  exportAttendanceToExcel,
  exportEmployeeMonthReport,
  exportPeriodReportToExcel,
  type ReportPeriod,
} from '@/lib/exportExcel';
import {
  createId,
  getEmployees,
  getRecords,
  isAdminLoggedIn,
  saveEmployees,
  saveRecords,
  setAdminSession,
  todayISO,
} from '@/lib/storage';
import {
  ADMIN_CREDENTIALS,
  DEFAULT_ENTRY_TIME,
  DEFAULT_EXIT_TIME,
  EMPLOYEE_ROLES,
  formatTime12h,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
  type EmployeeRole,
} from '@/lib/types';

type Modal = 'none' | 'employee' | 'attendance' | 'edit-attendance';
type ViewTab = 'sheet' | 'report' | 'search';

const FAVICON_SRC = '/favicon.png';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'Not Marked'>('all');
  const [viewTab, setViewTab] = useState<ViewTab>('sheet');
  const [modal, setModal] = useState<Modal>('none');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [notice, setNotice] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchEmployeeId, setSearchEmployeeId] = useState('');
  const [searchMonth, setSearchMonth] = useState(() => parseISODate(todayISO()).getMonth() + 1);
  const [searchYear, setSearchYear] = useState(() => getYear(todayISO()));
  const [searchStatus, setSearchStatus] = useState<'all' | AttendanceStatus | 'Not Marked'>('all');

  const [empName, setEmpName] = useState('');
  const [empContact, setEmpContact] = useState('');
  const [empRole, setEmpRole] = useState<EmployeeRole>('BDE');

  const [employeeId, setEmployeeId] = useState('');
  const [attDate, setAttDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [entryTime, setEntryTime] = useState(DEFAULT_ENTRY_TIME);
  const [exitTime, setExitTime] = useState(DEFAULT_EXIT_TIME);

  useEffect(() => {
    setEmployees(getEmployees());
    setRecords(getRecords());
  }, []);

  const dayRows = useMemo(
    () => buildDayRows(employees, records, selectedDate, roleFilter),
    [employees, records, selectedDate, roleFilter]
  );

  const filteredDayRows = useMemo(() => {
    if (statusFilter === 'all') return dayRows;
    return dayRows.filter((row) => row.status === statusFilter);
  }, [dayRows, statusFilter]);

  const stats = useMemo(() => {
    const present = dayRows.filter((r) => r.status === 'Present').length;
    const absent = dayRows.filter((r) => r.status === 'Absent').length;
    const notMarked = dayRows.filter((r) => r.status === 'Not Marked').length;
    return {
      total: dayRows.length,
      present,
      absent,
      notMarked,
    };
  }, [dayRows]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (
      username.trim() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setAdminSession(true);
      setLoggedIn(true);
      setLoginError('');
      setPassword('');
    } else {
      setLoginError('Invalid admin username or password.');
    }
  };

  const handleLogout = () => {
    setAdminSession(false);
    setLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const openEmployeeModal = () => {
    setEmpName('');
    setEmpContact('');
    setEmpRole('BDE');
    setModal('employee');
  };

  const openAttendanceModal = (prefillEmployeeId?: string) => {
    setEmployeeId(prefillEmployeeId || employees[0]?.id || '');
    setAttDate(selectedDate);
    setStatus('Present');
    setEntryTime(DEFAULT_ENTRY_TIME);
    setExitTime(DEFAULT_EXIT_TIME);
    setEditing(null);
    setModal('attendance');
  };

  const openEditModal = (record: AttendanceRecord) => {
    setEditing(record);
    setEmployeeId(record.employeeId);
    setAttDate(record.date);
    setStatus(record.status);
    setEntryTime(record.entryTime || DEFAULT_ENTRY_TIME);
    setExitTime(record.exitTime || DEFAULT_EXIT_TIME);
    setModal('edit-attendance');
  };

  const closeModal = () => {
    setModal('none');
    setEditing(null);
  };

  const addEmployee = (e: FormEvent) => {
    e.preventDefault();
    const name = empName.trim();
    const contact = empContact.trim();
    if (!name || !contact) return;

    if (!/^\d{10}$/.test(contact)) {
      setNotice('Contact number must be 10 digits.');
      return;
    }

    const next: Employee = {
      id: createId(),
      name,
      contact,
      role: empRole,
      createdAt: new Date().toISOString(),
    };
    const updated = [...employees, next].sort((a, b) => a.name.localeCompare(b.name));
    setEmployees(updated);
    saveEmployees(updated);
    setNotice(`Employee “${name}” added.`);
    closeModal();
  };

  const deleteEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    if (!confirm(`Remove employee “${emp.name}”? Their attendance history stays saved.`)) return;
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveEmployees(updated);
    setNotice(`Employee “${emp.name}” removed.`);
  };

  const upsertAttendance = (
    employee: Employee,
    date: string,
    nextStatus: AttendanceStatus,
    nextEntry: string,
    nextExit: string,
    existingId?: string
  ) => {
    const payload: AttendanceRecord = {
      id: existingId || createId(),
      employeeId: employee.id,
      employeeName: employee.name,
      employeeContact: employee.contact,
      employeeRole: employee.role,
      date,
      status: nextStatus,
      entryTime: nextStatus === 'Present' ? nextEntry : '',
      exitTime: nextStatus === 'Present' ? nextExit : '',
      createdAt: new Date().toISOString(),
    };

    let updated: AttendanceRecord[];
    if (existingId) {
      updated = records.map((r) =>
        r.id === existingId ? { ...payload, createdAt: r.createdAt } : r
      );
    } else {
      const already = records.find((r) => r.employeeId === employee.id && r.date === date);
      if (already) {
        updated = records.map((r) =>
          r.id === already.id ? { ...payload, id: already.id, createdAt: already.createdAt } : r
        );
      } else {
        updated = [payload, ...records];
      }
    }

    setRecords(updated);
    saveRecords(updated);
    setSelectedDate(date);
  };

  const saveAttendance = (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId || !attDate) {
      setNotice('Please select employee and date.');
      return;
    }

    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee && !editing) {
      setNotice('Select a valid employee.');
      return;
    }

    if (status === 'Present') {
      if (!entryTime) {
        setNotice('Entry time is required for Present.');
        return;
      }
      if (exitTime && exitTime < entryTime) {
        setNotice('Exit time cannot be earlier than entry time.');
        return;
      }
    }

    const emp =
      employee ||
      ({
        id: editing!.employeeId,
        name: editing!.employeeName,
        contact: editing!.employeeContact,
        role: editing!.employeeRole,
        createdAt: editing!.createdAt,
      } as Employee);

    upsertAttendance(emp, attDate, status, entryTime, exitTime, editing?.id);
    setNotice(`Attendance marked ${status} for ${emp.name}.`);
    closeModal();
  };

  const markEntry = (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    if (existing?.status === 'Absent') {
      setNotice(`${employee.name} is marked Absent. Edit the record to change status.`);
      return;
    }
    upsertAttendance(
      employee,
      selectedDate,
      'Present',
      DEFAULT_ENTRY_TIME,
      existing?.exitTime || '',
      existing?.id
    );
    setNotice(
      `Entry marked for ${employee.name} at ${formatTime12h(DEFAULT_ENTRY_TIME)}.`
    );
  };

  const markExit = (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    if (!existing || existing.status !== 'Present' || !existing.entryTime) {
      setNotice(`Mark entry first for ${employee.name}.`);
      return;
    }
    upsertAttendance(
      employee,
      selectedDate,
      'Present',
      existing.entryTime || DEFAULT_ENTRY_TIME,
      DEFAULT_EXIT_TIME,
      existing.id
    );
    setNotice(
      `Exit marked for ${employee.name} at ${formatTime12h(DEFAULT_EXIT_TIME)}.`
    );
  };

  const markAbsent = (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    upsertAttendance(employee, selectedDate, 'Absent', '', '', existing?.id);
    setNotice(`${employee.name} marked Absent.`);
  };

  const deleteRecord = (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
    setNotice('Attendance record deleted.');
  };

  const weekRange = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const monthRange = useMemo(() => getMonthRange(selectedDate), [selectedDate]);

  const yearOptions = useMemo(() => {
    const current = getYear(todayISO());
    return [current - 1, current, current + 1];
  }, []);

  const matchedEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.contact.includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const searchEmployee = useMemo(
    () => employees.find((e) => e.id === searchEmployeeId) ?? null,
    [employees, searchEmployeeId]
  );

  const employeeMonthRows = useMemo(() => {
    if (!searchEmployee) return [];
    const rows = buildEmployeeMonthRows(searchEmployee, records, searchMonth, searchYear);
    if (searchStatus === 'all') return rows;
    return rows.filter((r) => r.status === searchStatus);
  }, [searchEmployee, records, searchMonth, searchYear, searchStatus]);

  const employeeMonthStats = useMemo(() => {
    if (!searchEmployee) {
      return { present: 0, absent: 0, notMarked: 0, total: 0 };
    }
    const all = buildEmployeeMonthRows(searchEmployee, records, searchMonth, searchYear);
    return {
      total: all.length,
      present: all.filter((r) => r.status === 'Present').length,
      absent: all.filter((r) => r.status === 'Absent').length,
      notMarked: all.filter((r) => r.status === 'Not Marked').length,
    };
  }, [searchEmployee, records, searchMonth, searchYear]);

  useEffect(() => {
    if (!searchEmployeeId && matchedEmployees.length === 1) {
      setSearchEmployeeId(matchedEmployees[0].id);
    }
    if (
      searchEmployeeId &&
      matchedEmployees.length > 0 &&
      !matchedEmployees.some((e) => e.id === searchEmployeeId)
    ) {
      setSearchEmployeeId(matchedEmployees[0]?.id || '');
    }
  }, [matchedEmployees, searchEmployeeId]);

  const handleExportReport = (period: ReportPeriod) => {
    if (employees.length === 0) {
      setNotice('Add employees first to generate a report.');
      return;
    }

    const result = exportPeriodReportToExcel({
      period,
      selectedDate,
      employees,
      records,
      roleFilter,
    });

    const periodName =
      period === 'day' ? 'Day-wise' : period === 'week' ? 'Week-wise' : 'Month-wise';
    setNotice(`${periodName} Excel report exported (${result.label}).`);
  };

  const handleExportEmployeeMonth = () => {
    if (!searchEmployee) {
      setNotice('Select an employee to export month report.');
      return;
    }
    const result = exportEmployeeMonthReport({
      employee: searchEmployee,
      records,
      month: searchMonth,
      year: searchYear,
      statusFilter: searchStatus,
    });
    setNotice(`Employee month Excel exported (${result.label}).`);
  };

  const handleExportAll = () => {
    if (records.length === 0) {
      setNotice('No attendance records to export.');
      return;
    }
    exportAttendanceToExcel(
      [...records].sort(
        (a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName)
      ),
      'all_dates'
    );
    setNotice(`Exported all ${records.length} record(s) to Excel.`);
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-6 overflow-hidden rounded-3xl bg-black p-6 shadow-xl shadow-slate-300/50">
            <img
              src={logoMark}
              alt="Nexsahay Startup Advisory"
              className="mx-auto h-auto w-full max-w-[280px] object-contain"
            />
          </div>

          <div className="mb-5 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Attendance Admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to manage Nexsahay employee attendance
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
          >
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
              placeholder="admin"
              autoComplete="username"
              required
            />

            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {loginError && (
              <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-950 active:scale-[0.99]"
            >
              Login as Admin
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              Default: <span className="font-medium text-slate-500">admin / admin123</span>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={FAVICON_SRC}
              alt="Nexsahay"
              className="h-11 w-11 rounded-full border border-slate-200 bg-black object-cover shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-lg font-bold text-slate-900">
                <span className="text-blue-900">Nex</span>
                <span className="text-green-500">sahay</span>
                <span className="ml-2 text-sm font-semibold text-slate-500">Attendance</span>
              </h1>
              <p className="truncate text-xs text-slate-500">Startup Advisory · Admin panel</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
        {notice && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Employees" value={stats.total} icon={<Users className="h-4 w-4" />} />
          <StatCard
            label="Present"
            value={stats.present}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="green"
          />
          <StatCard
            label="Absent"
            value={stats.absent}
            icon={<XCircle className="h-4 w-4" />}
            tone="rose"
          />
          <StatCard
            label="Not Marked"
            value={stats.notMarked}
            icon={<Clock3 className="h-4 w-4" />}
            tone="amber"
          />
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | EmployeeRole)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
              >
                <option value="all">All roles</option>
                {EMPLOYEE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | AttendanceStatus | 'Not Marked')
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
              >
                <option value="all">All status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Not Marked">Not Marked</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setViewTab('sheet')}
                  className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    viewTab === 'sheet'
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Sheet
                </button>
                <button
                  onClick={() => setViewTab('report')}
                  className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    viewTab === 'report'
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Report
                </button>
                <button
                  onClick={() => setViewTab('search')}
                  className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    viewTab === 'search'
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Office timing: Entry <span className="font-semibold text-slate-700">{formatTime12h(DEFAULT_ENTRY_TIME)}</span>
            {' · '}
            Exit <span className="font-semibold text-slate-700">{formatTime12h(DEFAULT_EXIT_TIME)}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openEmployeeModal}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </button>
            <button
              onClick={() => openAttendanceModal()}
              disabled={employees.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Attendance
            </button>
            <button
              onClick={() => handleExportReport('day')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              title={`Day report for ${formatDisplayDate(selectedDate)}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Day
            </button>
            <button
              onClick={() => handleExportReport('week')}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-950"
              title={`Week ${formatDisplayDate(weekRange.startISO)} – ${formatDisplayDate(weekRange.endISO)}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Week
            </button>
            <button
              onClick={() => handleExportReport('month')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              title={`Month report: ${monthRange.label}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Month
            </button>
            <button
              onClick={handleExportAll}
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100"
            >
              <Download className="h-4 w-4" />
              Export All Dates
            </button>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Excel period based on selected date:</span>
            {' '}Day = {formatDisplayDate(selectedDate)}
            {' · '}
            Week = {formatDisplayDate(weekRange.startISO)} to {formatDisplayDate(weekRange.endISO)}
            {' · '}
            Month = {monthRange.label}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Employee Box */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-900">Employee Box</h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-900">
                {employees.length}
              </span>
            </div>
            {employees.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                No employees yet. Add name, contact, and role to start.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {employees.map((emp) => {
                  const dayStatus =
                    dayRows.find((r) => r.employee.id === emp.id)?.status ?? 'Not Marked';
                  return (
                    <li
                      key={emp.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{emp.name}</p>
                          <p className="truncate text-xs font-medium text-blue-900">{emp.role}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                            <Phone className="h-3 w-3 shrink-0" />
                            {emp.contact}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteEmployee(emp.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Remove employee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusBadge status={dayStatus} />
                        <button
                          onClick={() => openAttendanceModal(emp.id)}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-blue-900 border border-blue-100 hover:bg-blue-50"
                        >
                          Mark
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Attendance Sheet / Report / Search */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    {viewTab === 'sheet'
                      ? 'Daily Attendance Sheet'
                      : viewTab === 'report'
                        ? 'All Employees Report'
                        : 'Employee Month Search'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {viewTab === 'search'
                      ? `${MONTH_OPTIONS[searchMonth - 1].label} ${searchYear}`
                      : `${formatDateLabel(selectedDate)} · ${filteredDayRows.length} employee(s)`}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  <p className="font-semibold">Standard Shift</p>
                  <p>
                    {formatTime12h(DEFAULT_ENTRY_TIME)} – {formatTime12h(DEFAULT_EXIT_TIME)}
                  </p>
                </div>
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="px-4 py-16 text-center sm:px-5">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No employees added</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add employees first, then use Mark Entry / Mark Exit on the sheet.
                </p>
              </div>
            ) : viewTab === 'search' ? (
              <div>
                <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Search employee
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Name, contact or role"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Employee
                    </label>
                    <select
                      value={searchEmployeeId}
                      onChange={(e) => setSearchEmployeeId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    >
                      <option value="">Select employee</option>
                      {matchedEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} · {emp.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Month
                    </label>
                    <select
                      value={searchMonth}
                      onChange={(e) => setSearchMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Year
                    </label>
                    <select
                      value={searchYear}
                      onChange={(e) => setSearchYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'Present', 'Absent', 'Not Marked'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSearchStatus(s)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          searchStatus === s
                            ? s === 'Present'
                              ? 'bg-green-600 text-white'
                              : s === 'Absent'
                                ? 'bg-rose-600 text-white'
                                : s === 'Not Marked'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-blue-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleExportEmployeeMonth}
                    disabled={!searchEmployee}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Employee Month
                  </button>
                </div>

                {!searchEmployee ? (
                  <div className="px-4 py-16 text-center sm:px-5">
                    <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-800">Search an employee</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Choose employee, month and year to see Present / Absent with entry & exit times.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-4 sm:p-5">
                      <MiniStat label="Days" value={employeeMonthStats.total} className="text-slate-800" />
                      <MiniStat label="Present" value={employeeMonthStats.present} className="text-green-700" />
                      <MiniStat label="Absent" value={employeeMonthStats.absent} className="text-rose-700" />
                      <MiniStat label="Not Marked" value={employeeMonthStats.notMarked} className="text-amber-700" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">S.No</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Day</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Entry Time</th>
                            <th className="px-4 py-3 font-semibold">Exit Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeMonthRows.map((row, index) => (
                            <tr
                              key={row.date}
                              className={`border-t border-slate-100 ${
                                row.status === 'Present'
                                  ? 'bg-green-50/40'
                                  : row.status === 'Absent'
                                    ? 'bg-rose-50/40'
                                    : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {formatDisplayDate(row.date)}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{row.day}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3 tabular-nums text-slate-700">
                                {row.entryTime ? formatTime12h(row.entryTime) : '—'}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-slate-700">
                                {row.exitTime ? formatTime12h(row.exitTime) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : viewTab === 'sheet' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold sm:px-4">S.No</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Employee</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Role</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Status</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Entry</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Exit</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDayRows.map(({ employee, record, status: rowStatus }, index) => {
                      const hasEntry = rowStatus === 'Present' && Boolean(record?.entryTime);
                      const hasExit = Boolean(record?.exitTime);
                      return (
                        <tr
                          key={employee.id}
                          className={`border-t border-slate-100 ${
                            rowStatus === 'Present'
                              ? 'bg-green-50/30'
                              : rowStatus === 'Absent'
                                ? 'bg-rose-50/30'
                                : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="px-3 py-3 text-slate-500 sm:px-4">{index + 1}</td>
                          <td className="px-3 py-3 sm:px-4">
                            <p className="font-semibold text-slate-900">{employee.name}</p>
                            <p className="text-xs text-slate-500">{employee.contact}</p>
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <RoleBadge role={employee.role} />
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <StatusBadge
                              status={rowStatus}
                              detail={
                                hasEntry && !hasExit
                                  ? 'On Duty'
                                  : hasEntry && hasExit
                                    ? 'Completed'
                                    : undefined
                              }
                            />
                          </td>
                          <td className="px-3 py-3 font-medium tabular-nums text-slate-800 sm:px-4">
                            {hasEntry ? formatTime12h(record!.entryTime) : '—'}
                          </td>
                          <td className="px-3 py-3 font-medium tabular-nums text-slate-800 sm:px-4">
                            {hasExit ? (
                              formatTime12h(record!.exitTime)
                            ) : hasEntry ? (
                              <span className="text-amber-600">Pending</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => markEntry(employee)}
                                disabled={rowStatus === 'Absent' || hasEntry}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-40"
                                title={`Mark Entry (${formatTime12h(DEFAULT_ENTRY_TIME)})`}
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                Mark Entry
                              </button>
                              <button
                                onClick={() => markExit(employee)}
                                disabled={!hasEntry || hasExit}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title={`Mark Exit (${formatTime12h(DEFAULT_EXIT_TIME)})`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark Exit
                              </button>
                              <button
                                onClick={() => markAbsent(employee)}
                                disabled={rowStatus === 'Absent' || hasEntry}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Absent
                              </button>
                              {record && (
                                <>
                                  <button
                                    onClick={() => openEditModal(record)}
                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-blue-900"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteRecord(record.id)}
                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-rose-600"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <MiniStat label="Present" value={stats.present} className="text-green-700" />
                  <MiniStat label="Absent" value={stats.absent} className="text-rose-700" />
                  <MiniStat label="Not Marked" value={stats.notMarked} className="text-amber-700" />
                </div>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-5">S.No</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Employee</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Contact</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Role</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Entry</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Exit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDayRows.map((row, index) => (
                      <tr key={row.employee.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-500 sm:px-5">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">
                          {row.employee.name}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 sm:px-5">
                          {row.employee.contact}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <RoleBadge role={row.employee.role} />
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700 sm:px-5">
                          {row.record?.entryTime
                            ? formatTime12h(row.record.entryTime)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700 sm:px-5">
                          {row.record?.exitTime
                            ? formatTime12h(row.record.exitTime)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {modal !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {modal === 'employee'
                  ? 'Add Employee'
                  : modal === 'edit-attendance'
                    ? 'Edit Attendance'
                    : 'Add Attendance'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === 'employee' ? (
              <form onSubmit={addEmployee} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employee name
                  </label>
                  <input
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    placeholder="e.g. Rahul Sharma"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Contact number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={empContact}
                    onChange={(e) => setEmpContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    placeholder="10-digit mobile number"
                    required
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as EmployeeRole)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                  >
                    {EMPLOYEE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-950"
                  >
                    Save Employee
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveAttendance} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employee
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    required
                    disabled={!!editing}
                  >
                    <option value="" disabled>
                      Select employee
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} · {emp.role} · {emp.contact}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Attendance status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('Present');
                        setEntryTime(DEFAULT_ENTRY_TIME);
                        setExitTime(DEFAULT_EXIT_TIME);
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        status === 'Present'
                          ? 'border-green-500 bg-green-50 ring-4 ring-green-500/10'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <CheckCircle2
                        className={`mb-2 h-5 w-5 ${
                          status === 'Present' ? 'text-green-600' : 'text-slate-400'
                        }`}
                      />
                      <p className="text-sm font-bold text-slate-900">Present</p>
                      <p className="text-xs text-slate-500">Mark entry & exit</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Absent')}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        status === 'Absent'
                          ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <XCircle
                        className={`mb-2 h-5 w-5 ${
                          status === 'Absent' ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      />
                      <p className="text-sm font-bold text-slate-900">Absent</p>
                      <p className="text-xs text-slate-500">No entry / exit needed</p>
                    </button>
                  </div>
                </div>

                {status === 'Present' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                      Default office timing:{' '}
                      <span className="font-semibold">
                        {formatTime12h(DEFAULT_ENTRY_TIME)} – {formatTime12h(DEFAULT_EXIT_TIME)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Entry time
                        </label>
                        <input
                          type="time"
                          value={entryTime}
                          onChange={(e) => setEntryTime(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                          required
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime12h(entryTime)}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Exit time
                        </label>
                        <input
                          type="time"
                          value={exitTime}
                          onChange={(e) => setExitTime(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-800/10"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {exitTime ? formatTime12h(exitTime) : 'Optional / mark later'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-950"
                  >
                    {editing ? 'Update' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'rose' | 'amber';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-display text-xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  detail,
}: {
  status: AttendanceStatus | 'Not Marked';
  detail?: string;
}) {
  const styles = {
    Present: 'border-green-200 bg-green-50 text-green-700',
    Absent: 'border-rose-200 bg-rose-50 text-rose-700',
    'Not Marked': 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
      {detail && <span className="text-[11px] font-medium text-slate-500">{detail}</span>}
    </span>
  );
}

function RoleBadge({ role }: { role: EmployeeRole }) {
  const styles: Record<EmployeeRole, string> = {
    BDM: 'border-blue-200 bg-blue-50 text-blue-900',
    BDE: 'border-sky-200 bg-sky-50 text-sky-800',
    'Graphic Designer': 'border-emerald-200 bg-emerald-50 text-emerald-800',
    'Full Stack Developer': 'border-green-200 bg-green-50 text-green-800',
  };

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
      {role}
    </span>
  );
}

function formatDateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
