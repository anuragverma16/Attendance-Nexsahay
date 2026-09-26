import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Phone,
  Plus,
  Search,
  Sun,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
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
  apiCreateEmployee,
  apiCreateRole,
  apiDeleteAttendance,
  apiDeleteEmployee,
  apiDeleteRole,
  apiGetAttendance,
  apiGetEmployees,
  apiGetRoles,
  apiLogin,
  apiSeed,
  apiUpdateAttendance,
  apiUpdateEmployee,
  apiUpsertAttendance,
} from '@/lib/api';
import {
  applyStoredTheme,
  getTheme,
  isAdminLoggedIn,
  setAdminSession,
  setTheme,
  todayISO,
  type ThemeMode,
} from '@/lib/storage';
import {
  DEFAULT_ENTRY_TIME,
  DEFAULT_EXIT_TIME,
  EMPLOYEE_ROLES,
  formatTime12h,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
  type EmployeeRole,
  type Role,
} from '@/lib/types';

type Modal = 'none' | 'employee' | 'attendance' | 'edit-attendance' | 'role';
type ViewTab = 'sheet' | 'report' | 'search';

const FAVICON_SRC = '/favicon.png';
const LIGHT_LOGO_SRC = '/logo.png';
const DARK_LOGO_SRC = '/favicon.png';
const DAY_PAGE_SIZE = 5;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    applyStoredTheme();
    return getTheme();
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus | 'Not Marked'>('all');
  const [viewTab, setViewTab] = useState<ViewTab>('sheet');
  const [modal, setModal] = useState<Modal>('none');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [notice, setNotice] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [dayPage, setDayPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchEmployeeId, setSearchEmployeeId] = useState('');
  const [searchMonth, setSearchMonth] = useState(() => parseISODate(todayISO()).getMonth() + 1);
  const [searchYear, setSearchYear] = useState(() => getYear(todayISO()));
  const [searchStatus, setSearchStatus] = useState<'all' | AttendanceStatus | 'Holiday'>('all');

  const [empName, setEmpName] = useState('');
  const [empContact, setEmpContact] = useState('');
  const [empRole, setEmpRole] = useState<EmployeeRole>('BDE');
  const [empJoiningDate, setEmpJoiningDate] = useState('');

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [attDate, setAttDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [entryTime, setEntryTime] = useState(DEFAULT_ENTRY_TIME);
  const [exitTime, setExitTime] = useState(DEFAULT_EXIT_TIME);

  const refreshData = async () => {
    setLoadingData(true);
    try {
      const [emps, atts, rolesList] = await Promise.all([apiGetEmployees(), apiGetAttendance(), apiGetRoles()]);
      setEmployees(emps);
      setRecords(atts);
      setRoles(rolesList);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to load data from backend.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      void refreshData();
    }
  }, [loggedIn]);

  const dayRows = useMemo(
    () => buildDayRows(employees, records, selectedDate, roleFilter),
    [employees, records, selectedDate, roleFilter]
  );

  const filteredDayRows = useMemo(() => {
    if (statusFilter === 'all') return dayRows;
    return dayRows.filter((row) => row.status === statusFilter);
  }, [dayRows, statusFilter]);

  const dayPageCount = Math.max(1, Math.ceil(filteredDayRows.length / DAY_PAGE_SIZE));

  const pagedDayRows = useMemo(() => {
    const start = dayPage * DAY_PAGE_SIZE;
    return filteredDayRows.slice(start, start + DAY_PAGE_SIZE);
  }, [filteredDayRows, dayPage]);

  useEffect(() => {
    setDayPage(0);
  }, [selectedDate, roleFilter, statusFilter, viewTab]);

  useEffect(() => {
    if (dayPage > dayPageCount - 1) {
      setDayPage(Math.max(0, dayPageCount - 1));
    }
  }, [dayPage, dayPageCount]);

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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await apiLogin(username.trim(), password);
      setAdminSession(true);
      setLoggedIn(true);
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed.');
    }
  };

  const handleLogout = () => {
    setAdminSession(false);
    setLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const openEmployeeModal = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpContact('');
    setEmpRole((roles[0]?.name as EmployeeRole) || 'BDE');
    setEmpJoiningDate(todayISO());
    setModal('employee');
  };

  const openEditEmployeeModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmpName(employee.name);
    setEmpContact(employee.contact);
    setEmpRole(employee.role);
    setEmpJoiningDate(employee.joiningDate || '');
    setModal('employee');
    setSidebarOpen(false);
  };

  const openAttendanceModal = (prefillEmployeeId?: string) => {
    setEmployeeId(prefillEmployeeId || employees[0]?.id || '');
    setAttDate(selectedDate);
    setStatus('Present');
    setEntryTime(DEFAULT_ENTRY_TIME);
    setExitTime(DEFAULT_EXIT_TIME);
    setEditing(null);
    setModal('attendance');
    setSidebarOpen(false);
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
    setEditingEmployee(null);
  };

  const sidebarEmployees = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.contact.includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, sidebarSearch]);

  const saveEmployee = async (e: FormEvent) => {
    e.preventDefault();
    const name = empName.trim();
    const contact = empContact.trim();
    if (!name || !contact) return;

    if (!/^\d{10}$/.test(contact)) {
      setNotice('Contact number must be 10 digits.');
      return;
    }

    try {
      if (editingEmployee) {
        await apiUpdateEmployee(editingEmployee.id, {
          name,
          contact,
          role: empRole,
          joiningDate: empJoiningDate,
        });
        setNotice(`Employee “${name}” updated.`);
      } else {
        await apiCreateEmployee({ name, contact, role: empRole, joiningDate: empJoiningDate });
        setNotice(`Employee “${name}” added.`);
      }
      await refreshData();
      closeModal();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save employee.');
    }
  };

  const deleteEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    if (!confirm(`Remove employee “${emp.name}”? Their attendance history stays saved.`)) return;
    try {
      await apiDeleteEmployee(id);
      if (searchEmployeeId === id) setSearchEmployeeId('');
      await refreshData();
      setNotice(`Employee “${emp.name}” removed.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to delete employee.');
    }
  };

  const upsertAttendance = async (
    employee: Employee,
    date: string,
    nextStatus: AttendanceStatus,
    nextEntry: string,
    nextExit: string,
    existingId?: string
  ) => {
    try {
      if (existingId) {
        await apiUpdateAttendance(existingId, {
          employeeId: employee.id,
          date,
          status: nextStatus,
          entryTime: nextStatus === 'Present' ? nextEntry : '',
          exitTime: nextStatus === 'Present' ? nextExit : '',
        });
      } else {
        await apiUpsertAttendance({
          employeeId: employee.id,
          date,
          status: nextStatus,
          entryTime: nextStatus === 'Present' ? nextEntry : '',
          exitTime: nextStatus === 'Present' ? nextExit : '',
        });
      }
      setSelectedDate(date);
      await refreshData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save attendance.');
      throw err;
    }
  };

  const saveAttendance = async (e: FormEvent) => {
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
        joiningDate: '',
        createdAt: editing!.createdAt,
      } as Employee);

    try {
      await upsertAttendance(emp, attDate, status, entryTime, exitTime, editing?.id);
      setNotice(`Attendance marked ${status} for ${emp.name}.`);
      closeModal();
    } catch {
      // notice already set
    }
  };

  const markEntry = async (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    if (existing?.status === 'Absent') {
      setNotice(`${employee.name} is marked Absent. Edit the record to change status.`);
      return;
    }
    try {
      await upsertAttendance(
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
    } catch {
      // notice already set
    }
  };

  const markExit = async (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    if (!existing || existing.status !== 'Present' || !existing.entryTime) {
      setNotice(`Mark entry first for ${employee.name}.`);
      return;
    }
    try {
      await upsertAttendance(
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
    } catch {
      // notice already set
    }
  };

  const markAbsent = async (employee: Employee) => {
    const existing = records.find(
      (r) => r.employeeId === employee.id && r.date === selectedDate
    );
    try {
      await upsertAttendance(employee, selectedDate, 'Absent', '', '', existing?.id);
      setNotice(`${employee.name} marked Absent.`);
    } catch {
      // notice already set
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await apiDeleteAttendance(id);
      await refreshData();
      setNotice('Attendance record deleted.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to delete attendance.');
    }
  };

  const handleSeedSample = async () => {
    if (!confirm('Replace backend data with sample employees and attendance?')) return;
    try {
      const result = await apiSeed();
      await refreshData();
      setNotice(
        `${result.message} (${result.employees} employees, ${result.attendance} records)`
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to seed sample data.');
    }
  };

  const openRoleModal = () => {
    setRoleName('');
    setRoleDescription('');
    setModal('role');
  };

  const saveRole = async (e: FormEvent) => {
    e.preventDefault();
    const name = roleName.trim();
    const description = roleDescription.trim();

    if (!name) {
      setNotice('Role name is required.');
      return;
    }

    try {
      await apiCreateRole({ name, description });
      setNotice(`Role "${name}" added successfully.`);
      await refreshData();
      setRoleName('');
      setRoleDescription('');
      setModal('none');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to create role.');
    }
  };

  const deleteCustomRole = async (id: string) => {
    const role = roles.find((r) => r._id === id);
    if (!role) return;

    if (role.isDefault) {
      setNotice('Cannot delete system default roles.');
      return;
    }

    if (!confirm(`Delete role "${role.name}"?`)) return;

    try {
      await apiDeleteRole(id);
      setNotice(`Role "${role.name}" deleted.`);
      await refreshData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to delete role.');
    }
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
      return { present: 0, absent: 0, holiday: 0, total: 0 };
    }
    const all = buildEmployeeMonthRows(searchEmployee, records, searchMonth, searchYear);
    return {
      total: all.length,
      present: all.filter((r) => r.status === 'Present').length,
      absent: all.filter((r) => r.status === 'Absent').length,
      holiday: all.filter((r) => r.status === 'Holiday').length,
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

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const isMobileDrawer =
      sidebarOpen && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const lock = isMobileDrawer || modal !== 'none';
    if (!lock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, modal]);

  if (!loggedIn) {
    return (
      <div
        className={`relative min-h-screen w-full overflow-hidden transition-colors duration-300 ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
        }`}
      >
        <button
          type="button"
          onClick={toggleTheme}
          className={`absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-lg transition sm:right-6 sm:top-6 ${
            isDark
              ? 'border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
          {/* Logo panel — compact on phones */}
          <section
            className={`relative flex min-h-[30vh] items-center justify-center sm:min-h-[38vh] lg:min-h-screen ${
              isDark ? 'bg-black' : 'bg-white'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-10 lg:p-14">
              {isDark ? (
                <div className="flex h-full w-full max-w-lg flex-col items-center justify-center gap-3 animate-fade-in sm:gap-6">
                  <img
                    src={DARK_LOGO_SRC}
                    alt="Nexsahay"
                    className="h-auto w-full max-w-[160px] object-contain object-center sm:max-w-[280px] md:max-w-[340px]"
                  />
                  <div className="text-center">
                    <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                      <span className="text-blue-400">Nex</span>
                      <span className="text-green-400">sahay</span>
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:mt-2 sm:text-xs">
                      Startup Advisory
                    </p>
                  </div>
                </div>
              ) : (
                <img
                  src={LIGHT_LOGO_SRC}
                  alt="Nexsahay Startup Advisory"
                  className="h-full w-full max-h-[28vh] object-contain object-center animate-fade-in sm:max-h-[50vh] lg:max-h-[70vh]"
                />
              )}
            </div>
          </section>

          {/* Login form panel */}
          <section
            className={`flex min-h-0 flex-1 items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10 lg:min-h-screen ${
              isDark
                ? 'bg-slate-950'
                : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40'
            }`}
          >
            <div className="w-full max-w-md animate-fade-in">
              <div className="mb-5 text-center sm:mb-8 lg:text-left">
                <h1
                  className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Attendance Admin
                </h1>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sign in to manage Nexsahay employee attendance
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className={`rounded-2xl border p-5 shadow-xl sm:rounded-3xl sm:p-8 ${
                  isDark
                    ? 'border-slate-800 bg-slate-900 shadow-black/40'
                    : 'border-slate-200 bg-white shadow-slate-200/60'
                }`}
              >
                <label
                  className={`mb-1.5 block text-sm font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`mb-4 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${
                    isDark
                      ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/15'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-800 focus:bg-white focus:ring-blue-800/10'
                  }`}
                  placeholder="admin"
                  autoComplete="username"
                  required
                />

                <label
                  className={`mb-1.5 block text-sm font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mb-4 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 ${
                    isDark
                      ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/15'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-800 focus:bg-white focus:ring-blue-800/10'
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />

                {loginError && (
                  <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] ${
                    isDark
                      ? 'bg-green-600 hover:bg-green-500'
                      : 'bg-blue-900 hover:bg-blue-950'
                  }`}
                >
                  Login as Admin
                </button>

                <p
                  className={`mt-4 text-center text-xs ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Default:{' '}
                  <span className={isDark ? 'font-medium text-slate-300' : 'font-medium text-slate-500'}>
                    admin / admin123
                  </span>
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : ''}`}>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          isDark
            ? 'border-slate-800 bg-slate-950/90'
            : 'border-slate-200/80 bg-white/90'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src={isDark ? DARK_LOGO_SRC : FAVICON_SRC}
              alt="Nexsahay"
              className={`h-9 w-9 shrink-0 rounded-full border object-cover shadow-sm sm:h-11 sm:w-11 ${
                isDark ? 'border-slate-700 bg-black' : 'border-slate-200 bg-black'
              }`}
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-base font-bold sm:text-lg">
                <span className={isDark ? 'text-blue-400' : 'text-blue-900'}>Nex</span>
                <span className="text-green-500">sahay</span>
                <span
                  className={`ml-1.5 text-xs font-semibold sm:ml-2 sm:text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Attendance
                </span>
              </h1>
              <p className={`hidden truncate text-xs sm:block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Startup Advisory · Admin panel
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center rounded-xl border p-2.5 text-sm font-medium transition sm:px-3 sm:py-2 ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 rounded-xl border p-2.5 text-sm font-medium transition sm:px-3 sm:py-2 ${
                isDark
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 animate-fade-in">
        {notice && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              isDark
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {notice}
          </div>
        )}

        <section className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Total Employees" value={stats.total} icon={<Users className="h-4 w-4" />} dark={isDark} />
          <StatCard
            label="Present"
            value={stats.present}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="green"
            dark={isDark}
          />
          <StatCard
            label="Absent"
            value={stats.absent}
            icon={<XCircle className="h-4 w-4" />}
            tone="rose"
            dark={isDark}
          />
          <StatCard
            label="Not Marked"
            value={stats.notMarked}
            icon={<Clock3 className="h-4 w-4" />}
            tone="amber"
            dark={isDark}
          />
        </section>

        <section className="ui-panel mb-4 flex flex-col gap-3 p-3 sm:mb-6 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="ui-label">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ui-field"
              />
            </div>
            <div>
              <label className="ui-label">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | EmployeeRole)}
                className="ui-field"
              >
                <option value="all">All roles</option>
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <option key={role._id} value={role.name}>
                      {role.name}
                    </option>
                  ))
                ) : (
                  EMPLOYEE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="ui-label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | AttendanceStatus | 'Not Marked')
                }
                className="ui-field"
              >
                <option value="all">All status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Not Marked">Not Marked</option>
              </select>
            </div>
            <div className="flex items-end">
              <div
                className={`flex w-full rounded-xl border p-1 ${
                  isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => setViewTab('sheet')}
                  className={`flex-1 rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:px-2 sm:text-sm ${
                    viewTab === 'sheet'
                      ? isDark
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-900 text-white'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Sheet
                </button>
                <button
                  onClick={() => setViewTab('report')}
                  className={`flex-1 rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:px-2 sm:text-sm ${
                    viewTab === 'report'
                      ? isDark
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-900 text-white'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Report
                </button>
                <button
                  onClick={() => setViewTab('search')}
                  className={`flex-1 rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:px-2 sm:text-sm ${
                    viewTab === 'search'
                      ? isDark
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-900 text-white'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <p className="ui-muted text-xs">
            Office timing: Entry{' '}
            <span className={isDark ? 'font-semibold text-slate-200' : 'font-semibold text-slate-700'}>
              {formatTime12h(DEFAULT_ENTRY_TIME)}
            </span>
            {' · '}
            Exit{' '}
            <span className={isDark ? 'font-semibold text-slate-200' : 'font-semibold text-slate-700'}>
              {formatTime12h(DEFAULT_EXIT_TIME)}
            </span>
          </p>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button onClick={openEmployeeModal} className="ui-btn-ghost justify-center sm:justify-start">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="truncate">Add Employee</span>
            </button>
            <button onClick={openRoleModal} className="ui-btn-ghost justify-center sm:justify-start">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Custom Role</span>
            </button>
            <button
              onClick={() => openAttendanceModal()}
              disabled={employees.length === 0}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:justify-start ${
                isDark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Add Attendance</span>
            </button>
            <button
              onClick={() => handleExportReport('day')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:justify-start"
              title={`Day report for ${formatDisplayDate(selectedDate)}`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span className="truncate">Export Day</span>
            </button>
            <button
              onClick={() => handleExportReport('week')}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white sm:justify-start ${
                isDark ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-900 hover:bg-blue-950'
              }`}
              title={`Week ${formatDisplayDate(weekRange.startISO)} – ${formatDisplayDate(weekRange.endISO)}`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span className="truncate">Export Week</span>
            </button>
            <button
              onClick={() => handleExportReport('month')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 sm:justify-start"
              title={`Month report: ${monthRange.label}`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span className="truncate">Export Month</span>
            </button>
            <button
              onClick={handleExportAll}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold sm:justify-start ${
                isDark
                  ? 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">Export All</span>
            </button>
            <button
              onClick={() => void handleSeedSample()}
              className="ui-btn-ghost col-span-2 justify-center sm:col-span-1 sm:justify-start"
              title="Load sample employees and attendance into backend"
            >
              Load Sample Data
            </button>
            {loadingData && (
              <span className="ui-muted col-span-2 self-center text-center text-xs font-medium sm:col-span-1 sm:text-left">
                Syncing backend...
              </span>
            )}
          </div>

          <div
            className={`ui-soft px-3 py-2 text-[11px] leading-relaxed sm:text-xs ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <span className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-800'}>
              Excel period:
            </span>{' '}
            <span className="block sm:inline">Day = {formatDisplayDate(selectedDate)}</span>
            <span className="hidden sm:inline">{' · '}</span>
            <span className="block sm:inline">
              Week = {formatDisplayDate(weekRange.startISO)} to {formatDisplayDate(weekRange.endISO)}
            </span>
            <span className="hidden sm:inline">{' · '}</span>
            <span className="block sm:inline">Month = {monthRange.label}</span>
          </div>
        </section>

        {/* Roles Management Section */}
        <section className={`ui-panel mb-6 p-3 sm:p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className={`text-sm font-semibold sm:text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Available Roles
            </h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-900'
              }`}
            >
              {roles.length}
            </span>
          </div>

          {roles.length === 0 ? (
            <p className="ui-muted text-sm">No roles available.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role._id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isDark
                      ? 'border-slate-700 bg-slate-950'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {role.name}
                      {role.isDefault && (
                        <span
                          className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isDark
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          System
                        </span>
                      )}
                    </p>
                    {role.description && (
                      <p className="ui-muted text-xs">{role.description}</p>
                    )}
                  </div>
                  {!role.isDefault && (
                    <button
                      onClick={() => deleteCustomRole(role._id)}
                      className={`ml-2 rounded-lg border p-1.5 text-xs font-semibold shrink-0 ${
                        isDark
                          ? 'border-slate-700 text-rose-300 hover:bg-slate-800'
                          : 'border-slate-200 text-rose-600 hover:bg-white'
                      }`}
                      title="Delete custom role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Phone-only employee list toggle */}
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <Menu className="h-4 w-4" />
            Employees
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-900'
              }`}
            >
              {employees.length}
            </span>
          </button>
          <button
            type="button"
            onClick={openEmployeeModal}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white ${
              isDark ? 'bg-green-600' : 'bg-blue-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Add
          </button>
        </div>

        {/* Phone drawer overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close employee list"
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Phone drawer (separate from PC layout so it never overlaps the sheet) */}
        <aside
          className={`ui-panel fixed inset-y-0 left-0 z-50 flex w-[min(100vw,20rem)] flex-col rounded-none p-0 shadow-2xl transition-transform duration-300 md:hidden ${
            sidebarOpen
              ? 'translate-x-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
              : 'pointer-events-none -translate-x-full'
          }`}
          aria-hidden={!sidebarOpen}
        >
          <EmployeeSidebarBody
            isDark={isDark}
            employees={employees}
            sidebarEmployees={sidebarEmployees}
            dayRows={dayRows}
            sidebarSearch={sidebarSearch}
            setSidebarSearch={setSidebarSearch}
            showClose
            onClose={() => setSidebarOpen(false)}
            onAddEmployee={openEmployeeModal}
            onEditEmployee={openEditEmployeeModal}
            onDeleteEmployee={deleteEmployee}
            onMarkAttendance={openAttendanceModal}
            showDesktopAdd={false}
          />
        </aside>

        <div className="grid min-w-0 gap-6 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          {/* PC / tablet sidebar — in normal document flow, never fixed */}
          <aside className="ui-panel sticky top-[4.5rem] z-0 hidden max-h-[calc(100vh-6rem)] flex-col overflow-hidden p-0 md:flex">
            <EmployeeSidebarBody
              isDark={isDark}
              employees={employees}
              sidebarEmployees={sidebarEmployees}
              dayRows={dayRows}
              sidebarSearch={sidebarSearch}
              setSidebarSearch={setSidebarSearch}
              showClose={false}
              onClose={() => setSidebarOpen(false)}
              onAddEmployee={openEmployeeModal}
              onEditEmployee={openEditEmployeeModal}
              onDeleteEmployee={deleteEmployee}
              onMarkAttendance={openAttendanceModal}
              showDesktopAdd
            />
          </aside>

          {/* Attendance Sheet / Report / Search */}
          <section className="ui-panel min-w-0 overflow-hidden">
            <div
              className={`border-b px-3 py-3 sm:px-5 sm:py-4 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="ui-title text-sm sm:text-base">
                    {viewTab === 'sheet'
                      ? 'Daily Attendance Sheet'
                      : viewTab === 'report'
                        ? 'All Employees Report'
                        : 'Employee Month Search'}
                  </h2>
                  <p className="ui-muted mt-0.5 text-xs">
                    {viewTab === 'search'
                      ? `${MONTH_OPTIONS[searchMonth - 1].label} ${searchYear}`
                      : `${formatDateLabel(selectedDate)} · ${filteredDayRows.length} employee(s)`}
                  </p>
                </div>
                <div
                  className={`rounded-xl border px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-xs ${
                    isDark
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                      : 'border-blue-100 bg-blue-50 text-blue-900'
                  }`}
                >
                  <p className="font-semibold">Shift</p>
                  <p className="whitespace-nowrap">
                    {formatTime12h(DEFAULT_ENTRY_TIME)} – {formatTime12h(DEFAULT_EXIT_TIME)}
                  </p>
                </div>
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="px-4 py-16 text-center sm:px-5">
                <div
                  className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Users className="h-6 w-6" />
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  No employees added
                </p>
                <p className="ui-muted mt-1 text-sm">
                  Add employees first, then use Mark Entry / Mark Exit on the sheet.
                </p>
              </div>
            ) : viewTab === 'search' ? (
              <div>
                <div
                  className={`grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <div className="lg:col-span-2">
                    <label className="ui-label">Search employee</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Name, contact or role"
                        className="ui-field pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ui-label">Employee</label>
                    <select
                      value={searchEmployeeId}
                      onChange={(e) => setSearchEmployeeId(e.target.value)}
                      className="ui-field"
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
                    <label className="ui-label">Month</label>
                    <select
                      value={searchMonth}
                      onChange={(e) => setSearchMonth(Number(e.target.value))}
                      className="ui-field"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ui-label">Year</label>
                    <select
                      value={searchYear}
                      onChange={(e) => setSearchYear(Number(e.target.value))}
                      className="ui-field"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'Present', 'Absent', 'Holiday'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSearchStatus(s)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          searchStatus === s
                            ? s === 'Present'
                              ? 'bg-green-600 text-white'
                              : s === 'Absent'
                                ? 'bg-rose-600 text-white'
                                : s === 'Holiday'
                                  ? 'bg-indigo-500 text-white'
                                  : isDark
                                    ? 'bg-green-600 text-white'
                                    : 'bg-blue-900 text-white'
                            : isDark
                              ? 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Month
                  </button>
                </div>

                {!searchEmployee ? (
                  <div className="px-4 py-16 text-center sm:px-5">
                    <Search className={`mx-auto mb-3 h-8 w-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                      Search an employee
                    </p>
                    <p className="ui-muted mt-1 text-sm">
                      Choose employee, month and year to see Present / Absent with entry & exit times.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={`grid grid-cols-2 gap-2 border-b p-3 sm:grid-cols-4 sm:gap-3 sm:p-5 ${
                        isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <MiniStat label="Days" value={employeeMonthStats.total} className={isDark ? 'text-slate-100' : 'text-slate-800'} dark={isDark} />
                      <MiniStat label="Present" value={employeeMonthStats.present} className="text-green-500" dark={isDark} />
                      <MiniStat label="Absent" value={employeeMonthStats.absent} className="text-rose-400" dark={isDark} />
                      <MiniStat label="Holiday" value={employeeMonthStats.holiday} className="text-indigo-400" dark={isDark} />
                    </div>

                    {/* Phone cards */}
                    <div className="mobile-card-list md:hidden">
                      {employeeMonthRows.map((row, index) => (
                        <article key={row.date} className="ui-soft p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="ui-muted text-[11px]">#{index + 1} · {row.day}</p>
                              <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {formatDisplayDate(row.date)}
                              </p>
                            </div>
                            <StatusBadge status={row.status} dark={isDark} />
                          </div>
                          <div
                            className={`mt-3 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2 text-xs ${
                              isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div>
                              <p className="ui-muted">Entry</p>
                              <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                {row.entryTime ? formatTime12h(row.entryTime) : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="ui-muted">Exit</p>
                              <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                {row.exitTime ? formatTime12h(row.exitTime) : '—'}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full text-left text-sm">
                        <thead className="ui-table-head">
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
                              className={`ui-row ${
                                row.status === 'Present'
                                  ? isDark
                                    ? 'bg-green-500/10'
                                    : 'bg-green-50/40'
                                  : row.status === 'Absent'
                                    ? isDark
                                      ? 'bg-rose-500/10'
                                      : 'bg-rose-50/40'
                                    : ''
                              }`}
                            >
                              <td className="ui-muted px-4 py-3">{index + 1}</td>
                              <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {formatDisplayDate(row.date)}
                              </td>
                              <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{row.day}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={row.status} dark={isDark} />
                              </td>
                              <td className={`px-4 py-3 tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {row.entryTime ? formatTime12h(row.entryTime) : '—'}
                              </td>
                              <td className={`px-4 py-3 tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
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
              <div>
                {/* Phone cards */}
                <div className="mobile-card-list md:hidden">
                  {pagedDayRows.map(({ employee, record, status: rowStatus }, index) => {
                    const rowNumber = dayPage * DAY_PAGE_SIZE + index + 1;
                    const hasEntry = rowStatus === 'Present' && Boolean(record?.entryTime);
                    const hasExit = Boolean(record?.exitTime);
                    return (
                      <article key={employee.id} className="ui-soft p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="ui-muted text-[11px]">#{rowNumber}</p>
                            <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {employee.name}
                            </p>
                            <p className="ui-muted text-xs">{employee.contact}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <RoleBadge role={employee.role} dark={isDark} />
                            <StatusBadge
                              status={rowStatus}
                              dark={isDark}
                              detail={
                                hasEntry && !hasExit
                                  ? 'On Duty'
                                  : hasEntry && hasExit
                                    ? 'Completed'
                                    : undefined
                              }
                            />
                          </div>
                        </div>
                        <div
                          className={`mt-3 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2 text-xs ${
                            isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div>
                            <p className="ui-muted">Entry</p>
                            <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              {hasEntry ? formatTime12h(record!.entryTime) : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="ui-muted">Exit</p>
                            <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              {hasExit ? (
                                formatTime12h(record!.exitTime)
                              ) : hasEntry ? (
                                <span className="text-amber-400">Pending</span>
                              ) : (
                                '—'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => markEntry(employee)}
                            disabled={rowStatus === 'Absent' || hasEntry}
                            className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                              isDark ? 'bg-blue-700' : 'bg-blue-900'
                            }`}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Entry
                          </button>
                          <button
                            onClick={() => markExit(employee)}
                            disabled={!hasEntry || hasExit}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Exit
                          </button>
                          <button
                            onClick={() => markAbsent(employee)}
                            disabled={rowStatus === 'Absent' || hasEntry}
                            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                              isDark
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Absent
                          </button>
                        </div>
                        {record && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => openEditModal(record)}
                              className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold ${
                                isDark
                                  ? 'border-slate-700 text-slate-300'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold ${
                                isDark
                                  ? 'border-slate-700 text-rose-300'
                                  : 'border-slate-200 text-rose-600'
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="ui-table-head">
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
                      {pagedDayRows.map(({ employee, record, status: rowStatus }, index) => {
                        const rowNumber = dayPage * DAY_PAGE_SIZE + index + 1;
                        const hasEntry = rowStatus === 'Present' && Boolean(record?.entryTime);
                        const hasExit = Boolean(record?.exitTime);
                        return (
                          <tr
                            key={employee.id}
                            className={`ui-row ${
                              rowStatus === 'Present'
                                ? isDark
                                  ? 'bg-green-500/10'
                                  : 'bg-green-50/30'
                                : rowStatus === 'Absent'
                                  ? isDark
                                    ? 'bg-rose-500/10'
                                    : 'bg-rose-50/30'
                                  : isDark
                                    ? 'hover:bg-slate-800/50'
                                    : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="ui-muted px-3 py-3 sm:px-4">{rowNumber}</td>
                            <td className="px-3 py-3 sm:px-4">
                              <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {employee.name}
                              </p>
                              <p className="ui-muted text-xs">{employee.contact}</p>
                            </td>
                            <td className="px-3 py-3 sm:px-4">
                              <RoleBadge role={employee.role} dark={isDark} />
                            </td>
                            <td className="px-3 py-3 sm:px-4">
                              <StatusBadge
                                status={rowStatus}
                                dark={isDark}
                                detail={
                                  hasEntry && !hasExit
                                    ? 'On Duty'
                                    : hasEntry && hasExit
                                      ? 'Completed'
                                      : undefined
                                }
                              />
                            </td>
                            <td className={`px-3 py-3 font-medium tabular-nums sm:px-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {hasEntry ? formatTime12h(record!.entryTime) : '—'}
                            </td>
                            <td className={`px-3 py-3 font-medium tabular-nums sm:px-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {hasExit ? (
                                formatTime12h(record!.exitTime)
                              ) : hasEntry ? (
                                <span className="text-amber-400">Pending</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-3 sm:px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  onClick={() => markEntry(employee)}
                                  disabled={rowStatus === 'Absent' || hasEntry}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isDark ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-900 hover:bg-blue-950'
                                  }`}
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
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isDark
                                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  }`}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Absent
                                </button>
                                {record && (
                                  <>
                                    <button
                                      onClick={() => openEditModal(record)}
                                      className={`rounded-lg border p-1.5 ${
                                        isDark
                                          ? 'border-slate-700 bg-slate-950 text-slate-400 hover:text-blue-300'
                                          : 'border-slate-200 bg-white text-slate-500 hover:text-blue-900'
                                      }`}
                                      title="Edit"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => deleteRecord(record.id)}
                                      className={`rounded-lg border p-1.5 ${
                                        isDark
                                          ? 'border-slate-700 bg-slate-950 text-slate-400 hover:text-rose-400'
                                          : 'border-slate-200 bg-white text-slate-500 hover:text-rose-600'
                                      }`}
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

                <DayListPagination
                  page={dayPage}
                  pageCount={dayPageCount}
                  pageSize={DAY_PAGE_SIZE}
                  total={filteredDayRows.length}
                  dark={isDark}
                  onPrev={() => setDayPage((p) => Math.max(0, p - 1))}
                  onNext={() => setDayPage((p) => Math.min(dayPageCount - 1, p + 1))}
                />
              </div>
            ) : (
              <div>
                <div
                  className={`grid grid-cols-3 gap-2 border-b p-3 sm:gap-3 sm:p-5 ${
                    isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <MiniStat label="Present" value={stats.present} className="text-green-500" dark={isDark} />
                  <MiniStat label="Absent" value={stats.absent} className="text-rose-400" dark={isDark} />
                  <MiniStat label="Not Marked" value={stats.notMarked} className="text-amber-400" dark={isDark} />
                </div>

                {/* Phone cards */}
                <div className="mobile-card-list md:hidden">
                  {pagedDayRows.map((row, index) => (
                    <article key={row.employee.id} className="ui-soft p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="ui-muted text-[11px]">#{dayPage * DAY_PAGE_SIZE + index + 1}</p>
                          <p className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {row.employee.name}
                          </p>
                          <p className="ui-muted text-xs">{row.employee.contact}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <RoleBadge role={row.employee.role} dark={isDark} />
                          <StatusBadge status={row.status} dark={isDark} />
                        </div>
                      </div>
                      <div
                        className={`mt-3 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2 text-xs ${
                          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <p className="ui-muted">Entry</p>
                          <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {row.record?.entryTime ? formatTime12h(row.record.entryTime) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="ui-muted">Exit</p>
                          <p className={`font-semibold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {row.record?.exitTime ? formatTime12h(row.record.exitTime) : '—'}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="ui-table-head">
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
                      {pagedDayRows.map((row, index) => (
                        <tr
                          key={row.employee.id}
                          className={`ui-row ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/70'}`}
                        >
                          <td className="ui-muted px-4 py-3 sm:px-5">{dayPage * DAY_PAGE_SIZE + index + 1}</td>
                          <td className={`px-4 py-3 font-medium sm:px-5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {row.employee.name}
                          </td>
                          <td className={`px-4 py-3 tabular-nums sm:px-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {row.employee.contact}
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            <RoleBadge role={row.employee.role} dark={isDark} />
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            <StatusBadge status={row.status} dark={isDark} />
                          </td>
                          <td className={`px-4 py-3 tabular-nums sm:px-5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {row.record?.entryTime
                              ? formatTime12h(row.record.entryTime)
                              : '-'}
                          </td>
                          <td className={`px-4 py-3 tabular-nums sm:px-5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {row.record?.exitTime
                              ? formatTime12h(row.record.exitTime)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <DayListPagination
                  page={dayPage}
                  pageCount={dayPageCount}
                  pageSize={DAY_PAGE_SIZE}
                  total={filteredDayRows.length}
                  dark={isDark}
                  onPrev={() => setDayPage((p) => Math.max(0, p - 1))}
                  onNext={() => setDayPage((p) => Math.min(dayPageCount - 1, p + 1))}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      {modal !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className={`max-h-[min(92dvh,100%)] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6 ${
              isDark ? 'border border-slate-800 bg-slate-900' : 'bg-white'
            }`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className={`font-display text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {modal === 'role'
                  ? 'Add Custom Role'
                  : modal === 'employee'
                    ? editingEmployee
                      ? 'Edit Employee'
                      : 'Add Employee'
                    : modal === 'edit-attendance'
                      ? 'Edit Attendance'
                      : 'Add Attendance'}
              </h2>
              <button
                onClick={closeModal}
                className={`rounded-lg p-1.5 ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === 'role' ? (
              <form onSubmit={saveRole} className="space-y-4">
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Role name
                  </label>
                  <input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="ui-field px-4 py-3"
                    placeholder="e.g. Team Lead, Developer"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Description (optional)
                  </label>
                  <textarea
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="ui-field px-4 py-3"
                    placeholder="e.g. Senior team member responsible for project leadership"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="ui-btn-ghost flex-1 justify-center py-3">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white ${
                      isDark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
                    }`}
                  >
                    Create Role
                  </button>
                </div>
              </form>
            ) : modal === 'employee' ? (
              <form onSubmit={saveEmployee} className="space-y-4">
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Employee name
                  </label>
                  <input
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="ui-field px-4 py-3"
                    placeholder="e.g. Rahul Sharma"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={empContact}
                    onChange={(e) => setEmpContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="ui-field px-4 py-3"
                    placeholder="10-digit mobile number"
                    required
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Role
                  </label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as EmployeeRole)}
                    className="ui-field px-4 py-3"
                  >
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <option key={role._id} value={role.name}>
                          {role.name} {role.isDefault && '(System)'}
                        </option>
                      ))
                    ) : (
                      EMPLOYEE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Joining date
                  </label>
                  <input
                    type="date"
                    value={empJoiningDate}
                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                    className="ui-field px-4 py-3"
                  />
                  <p className="ui-muted mt-1 text-xs">
                    Attendance is counted from this date. Reports treat earlier days as
                    not applicable, and later days with no record as a Holiday.
                  </p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="ui-btn-ghost flex-1 justify-center py-3">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white ${
                      isDark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
                    }`}
                  >
                    {editingEmployee ? 'Update Employee' : 'Save Employee'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveAttendance} className="space-y-4">
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Employee
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="ui-field px-4 py-3"
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
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="ui-field px-4 py-3"
                    required
                  />
                </div>

                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
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
                          ? isDark
                            ? 'border-green-500 bg-green-500/15 ring-4 ring-green-500/10'
                            : 'border-green-500 bg-green-50 ring-4 ring-green-500/10'
                          : isDark
                            ? 'border-slate-700 bg-slate-950 hover:bg-slate-800'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <CheckCircle2
                        className={`mb-2 h-5 w-5 ${
                          status === 'Present' ? 'text-green-500' : 'text-slate-400'
                        }`}
                      />
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Present</p>
                      <p className="ui-muted text-xs">Mark entry & exit</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Absent')}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        status === 'Absent'
                          ? isDark
                            ? 'border-rose-500 bg-rose-500/15 ring-4 ring-rose-500/10'
                            : 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10'
                          : isDark
                            ? 'border-slate-700 bg-slate-950 hover:bg-slate-800'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <XCircle
                        className={`mb-2 h-5 w-5 ${
                          status === 'Absent' ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      />
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Absent</p>
                      <p className="ui-muted text-xs">No entry / exit needed</p>
                    </button>
                  </div>
                </div>

                {status === 'Present' && (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        isDark
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                          : 'border-blue-100 bg-blue-50 text-blue-900'
                      }`}
                    >
                      Default office timing:{' '}
                      <span className="font-semibold">
                        {formatTime12h(DEFAULT_ENTRY_TIME)} – {formatTime12h(DEFAULT_EXIT_TIME)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Entry time
                        </label>
                        <input
                          type="time"
                          value={entryTime}
                          onChange={(e) => setEntryTime(e.target.value)}
                          className="ui-field px-4 py-3"
                          required
                        />
                        <p className="ui-muted mt-1 text-xs">{formatTime12h(entryTime)}</p>
                      </div>
                      <div>
                        <label className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Exit time
                        </label>
                        <input
                          type="time"
                          value={exitTime}
                          onChange={(e) => setExitTime(e.target.value)}
                          className="ui-field px-4 py-3"
                        />
                        <p className="ui-muted mt-1 text-xs">
                          {exitTime ? formatTime12h(exitTime) : 'Optional / mark later'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="ui-btn-ghost flex-1 justify-center py-3">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white ${
                      isDark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
                    }`}
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

function DayListPagination({
  page,
  pageCount,
  pageSize,
  total,
  dark,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  dark: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total === 0) return null;

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div
      className={`flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
        dark ? 'border-slate-800' : 'border-slate-100'
      }`}
    >
      <p className={`text-center text-xs sm:text-left ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Showing <span className={dark ? 'font-semibold text-slate-200' : 'font-semibold text-slate-700'}>{from}-{to}</span> of{' '}
        <span className={dark ? 'font-semibold text-slate-200' : 'font-semibold text-slate-700'}>{total}</span>
        {' · '}
        Page {page + 1} / {pageCount}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 0}
          className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark
              ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount - 1}
          className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
          }`}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmployeeSidebarBody({
  isDark,
  employees,
  sidebarEmployees,
  dayRows,
  sidebarSearch,
  setSidebarSearch,
  showClose,
  onClose,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onMarkAttendance,
  showDesktopAdd,
}: {
  isDark: boolean;
  employees: Employee[];
  sidebarEmployees: Employee[];
  dayRows: ReturnType<typeof buildDayRows>;
  sidebarSearch: string;
  setSidebarSearch: (value: string) => void;
  showClose: boolean;
  onClose: () => void;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onMarkAttendance: (employeeId: string) => void;
  showDesktopAdd: boolean;
}) {
  return (
    <>
      <div
        className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        <div className="min-w-0">
          <h2 className="ui-title">Employee List</h2>
          <p className="ui-muted text-xs">{employees.length} total employees</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-900'
            }`}
          >
            {sidebarEmployees.length}
          </span>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-1.5 ${
                isDark
                  ? 'text-slate-400 hover:bg-slate-800'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search name, contact, role"
            className="ui-field pl-9"
          />
        </div>
        {showDesktopAdd && (
          <button
            type="button"
            onClick={onAddEmployee}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white ${
              isDark ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-900 hover:bg-blue-950'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {employees.length === 0 ? (
          <p
            className={`mx-1 rounded-xl border border-dashed px-3 py-10 text-center text-sm ${
              isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            No employees yet. Add name, contact, and role to start.
          </p>
        ) : sidebarEmployees.length === 0 ? (
          <p className="ui-muted px-2 py-8 text-center text-sm">No employee matched your search.</p>
        ) : (
          <ul className="space-y-2">
            {sidebarEmployees.map((emp) => {
              const dayStatus =
                dayRows.find((r) => r.employee.id === emp.id)?.status ?? 'Not Marked';
              return (
                <li key={emp.id} className="ui-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}
                      >
                        {emp.name}
                      </p>
                      <p
                        className={`truncate text-xs font-medium ${
                          isDark ? 'text-blue-300' : 'text-blue-900'
                        }`}
                      >
                        {emp.role}
                      </p>
                      <p className="ui-muted mt-0.5 flex items-center gap-1 truncate text-xs">
                        <Phone className="h-3 w-3 shrink-0" />
                        {emp.contact}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => onEditEmployee(emp)}
                        className={`rounded-lg p-1.5 ${
                          isDark
                            ? 'text-slate-400 hover:bg-blue-500/15 hover:text-blue-300'
                            : 'text-slate-400 hover:bg-blue-50 hover:text-blue-900'
                        }`}
                        title="Edit employee"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEmployee(emp.id)}
                        className={`rounded-lg p-1.5 ${
                          isDark
                            ? 'text-slate-500 hover:bg-rose-500/15 hover:text-rose-400'
                            : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title="Remove employee"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={dayStatus} dark={isDark} />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditEmployee(emp)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                          isDark
                            ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onMarkAttendance(emp.id)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                          isDark
                            ? 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                            : 'border-blue-100 bg-white text-blue-900 hover:bg-blue-50'
                        }`}
                      >
                        Mark
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  dark = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'rose' | 'amber';
  dark?: boolean;
}) {
  const tones = dark
    ? {
        blue: 'bg-blue-500/15 text-blue-300',
        green: 'bg-green-500/15 text-green-400',
        rose: 'bg-rose-500/15 text-rose-400',
        amber: 'bg-amber-500/15 text-amber-400',
      }
    : {
        blue: 'bg-blue-50 text-blue-900',
        green: 'bg-green-50 text-green-700',
        rose: 'bg-rose-50 text-rose-700',
        amber: 'bg-amber-50 text-amber-700',
      };

  return (
    <div className="ui-panel p-3 sm:p-4">
      <div className="mb-1.5 flex items-center justify-between gap-1 sm:mb-2">
        <span className="ui-muted text-[11px] font-medium leading-tight sm:text-xs">{label}</span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg sm:h-7 sm:w-7 ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className={`font-display text-xl font-bold sm:text-2xl ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
  dark = false,
}: {
  label: string;
  value: number;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-center ${
        dark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="ui-muted text-xs">{label}</p>
      <p className={`font-display text-xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  detail,
  dark = false,
}: {
  status: AttendanceStatus | 'Not Marked' | 'Holiday';
  detail?: string;
  dark?: boolean;
}) {
  const styles = dark
    ? {
        Present: 'border-green-500/40 bg-green-500/15 text-green-300',
        Absent: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
        'Not Marked': 'border-amber-500/40 bg-amber-500/15 text-amber-300',
        Holiday: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
      }
    : {
        Present: 'border-green-200 bg-green-50 text-green-700',
        Absent: 'border-rose-200 bg-rose-50 text-rose-700',
        'Not Marked': 'border-amber-200 bg-amber-50 text-amber-700',
        Holiday: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
      {detail && <span className="ui-muted text-[11px] font-medium">{detail}</span>}
    </span>
  );
}

function RoleBadge({ role, dark = false }: { role: EmployeeRole; dark?: boolean }) {
  const styles: Record<EmployeeRole, string> = dark
    ? {
        BDM: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
        BDE: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
        'Graphic Designer': 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
        'Full Stack Developer': 'border-green-500/40 bg-green-500/15 text-green-300',
      }
    : {
        BDM: 'border-blue-200 bg-blue-50 text-blue-900',
        BDE: 'border-sky-200 bg-sky-50 text-sky-800',
        'Graphic Designer': 'border-emerald-200 bg-emerald-50 text-emerald-800',
        'Full Stack Developer': 'border-green-200 bg-green-50 text-green-800',
      };

  return (
    <span
      className={`inline-flex max-w-[10rem] truncate rounded-md border px-2 py-0.5 text-[11px] font-medium sm:max-w-none sm:text-xs ${styles[role]}`}
      title={role}
    >
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
