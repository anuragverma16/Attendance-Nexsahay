import * as XLSX from 'xlsx';
import {
  calcWorkingHours,
  eachDateInRange,
  formatDisplayDate,
  formatMonthName,
  formatWeekday,
  getMonthRange,
  getWeekNumber,
  getWeekRange,
  getYear,
  isDateInRange,
  monthYearToISO,
} from './dateRanges';
import type { AttendanceRecord, DayAttendanceRow, Employee } from './types';
import { DEFAULT_ENTRY_TIME, DEFAULT_EXIT_TIME, formatTime12h } from './types';
import { buildDayRows } from './attendanceRows';

export type ReportPeriod = 'day' | 'week' | 'month';

export type DetailRow = {
  'S.No': number | string;
  Date: string;
  Day: string;
  Month: string;
  Year: number | string;
  'Week No': number | string;
  'Employee Name': string;
  'Contact Number': string;
  Role: string;
  Status: string;
  'Entry Time': string;
  'Exit Time': string;
  'Working Hours': string;
};

const EMPTY_DETAIL: DetailRow = {
  'S.No': '',
  Date: '',
  Day: '',
  Month: '',
  Year: '',
  'Week No': '',
  'Employee Name': '',
  'Contact Number': '',
  Role: '',
  Status: '',
  'Entry Time': '',
  'Exit Time': '',
  'Working Hours': '',
};

const DETAIL_COLS = [
  { wch: 8 },
  { wch: 14 },
  { wch: 12 },
  { wch: 12 },
  { wch: 8 },
  { wch: 10 },
  { wch: 22 },
  { wch: 16 },
  { wch: 20 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 14 },
];

function makeDetailRow(
  index: number,
  date: string,
  employeeName: string,
  contact: string,
  role: string,
  status: string,
  entryTime: string,
  exitTime: string
): DetailRow {
  return {
    'S.No': index,
    Date: formatDisplayDate(date),
    Day: formatWeekday(date),
    Month: formatMonthName(date),
    Year: getYear(date),
    'Week No': getWeekNumber(date),
    'Employee Name': employeeName,
    'Contact Number': contact || '-',
    Role: role,
    Status: status,
    'Entry Time': entryTime ? formatTime12h(entryTime) : '-',
    'Exit Time': exitTime ? formatTime12h(exitTime) : '-',
    'Working Hours':
      status === 'Present' ? calcWorkingHours(entryTime, exitTime) || '-' : '-',
  };
}

function toDetailRowsFromDay(rows: DayAttendanceRow[], date: string): DetailRow[] {
  return rows.map((row, index) =>
    makeDetailRow(
      index + 1,
      date,
      row.employee.name,
      row.employee.contact,
      row.employee.role,
      row.status,
      row.record?.entryTime || '',
      row.record?.exitTime || ''
    )
  );
}

function toDetailRowsFromRecords(records: AttendanceRecord[]): DetailRow[] {
  const sorted = [...records].sort(
    (a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName)
  );
  return sorted.map((r, index) =>
    makeDetailRow(
      index + 1,
      r.date,
      r.employeeName,
      r.employeeContact,
      r.employeeRole,
      r.status,
      r.entryTime,
      r.exitTime
    )
  );
}

function buildEmployeeSummary(
  employees: Employee[],
  records: AttendanceRecord[],
  startISO: string,
  endISO: string
) {
  const dates = eachDateInRange(startISO, endISO);
  return employees
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((emp, index) => {
      const empRecords = records.filter(
        (r) => r.employeeId === emp.id && isDateInRange(r.date, startISO, endISO)
      );
      const presentDays = empRecords.filter((r) => r.status === 'Present').length;
      const absentDays = empRecords.filter((r) => r.status === 'Absent').length;
      const markedDays = empRecords.length;
      const notMarkedDays = Math.max(dates.length - markedDays, 0);
      const completedShifts = empRecords.filter(
        (r) => r.status === 'Present' && r.entryTime && r.exitTime
      ).length;

      return {
        'S.No': index + 1,
        'Employee Name': emp.name,
        'Contact Number': emp.contact || '-',
        Role: emp.role,
        'Total Days': dates.length,
        Present: presentDays,
        Absent: absentDays,
        'Not Marked': notMarkedDays,
        'Completed Shifts': completedShifts,
      };
    });
}

function buildDayWiseSummary(
  employees: Employee[],
  records: AttendanceRecord[],
  startISO: string,
  endISO: string
) {
  return eachDateInRange(startISO, endISO).map((date) => {
    const rows = buildDayRows(employees, records, date, 'all');
    return {
      Date: formatDisplayDate(date),
      Day: formatWeekday(date),
      Month: formatMonthName(date),
      Year: getYear(date),
      'Week No': getWeekNumber(date),
      'Total Employees': rows.length,
      Present: rows.filter((r) => r.status === 'Present').length,
      Absent: rows.filter((r) => r.status === 'Absent').length,
      'Not Marked': rows.filter((r) => r.status === 'Not Marked').length,
    };
  });
}

function writeWorkbook(
  sheets: { name: string; data: Record<string, unknown>[] | (string | number)[][] }[],
  filename: string
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    const worksheet = Array.isArray(data[0])
      ? XLSX.utils.aoa_to_sheet(data as (string | number)[][])
      : XLSX.utils.json_to_sheet(
          (data as Record<string, unknown>[]).length
            ? (data as Record<string, unknown>[])
            : [EMPTY_DETAIL]
        );

    if (!Array.isArray(data[0])) {
      worksheet['!cols'] = DETAIL_COLS;
    } else {
      worksheet['!cols'] = [{ wch: 22 }, { wch: 36 }];
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
  });

  XLSX.writeFile(workbook, filename);
}

function standardTimingRows(): (string | number)[][] {
  return [
    ['Standard Entry Time', formatTime12h(DEFAULT_ENTRY_TIME)],
    ['Standard Exit Time', formatTime12h(DEFAULT_EXIT_TIME)],
  ];
}

export function exportDayReportToExcel(rows: DayAttendanceRow[], date: string) {
  const detail = toDetailRowsFromDay(rows, date);
  const present = rows.filter((r) => r.status === 'Present').length;
  const absent = rows.filter((r) => r.status === 'Absent').length;
  const notMarked = rows.filter((r) => r.status === 'Not Marked').length;

  writeWorkbook(
    [
      {
        name: 'Summary',
        data: [
          ['Nexsahay Attendance Report'],
          ['Report Type', 'Day-wise'],
          ['Date', formatDisplayDate(date)],
          ['Day', formatWeekday(date)],
          ['Month', formatMonthName(date)],
          ['Year', getYear(date)],
          ['Week No', getWeekNumber(date)],
          ['Total Employees', rows.length],
          ['Present', present],
          ['Absent', absent],
          ['Not Marked', notMarked],
          ...standardTimingRows(),
        ],
      },
      { name: 'Attendance Detail', data: detail.length ? detail : [EMPTY_DETAIL] },
    ],
    `nexsahay_day_${date}.xlsx`
  );
}

export function exportPeriodReportToExcel(options: {
  period: ReportPeriod;
  selectedDate: string;
  employees: Employee[];
  records: AttendanceRecord[];
  roleFilter: 'all' | Employee['role'];
}) {
  const { period, selectedDate, employees, records, roleFilter } = options;
  const filteredEmployees =
    roleFilter === 'all' ? employees : employees.filter((e) => e.role === roleFilter);

  if (period === 'day') {
    const rows = buildDayRows(filteredEmployees, records, selectedDate, 'all');
    exportDayReportToExcel(rows, selectedDate);
    return { label: formatDisplayDate(selectedDate), count: rows.length };
  }

  const range =
    period === 'week' ? getWeekRange(selectedDate) : getMonthRange(selectedDate);
  const startISO = range.startISO;
  const endISO = range.endISO;
  const periodLabel =
    period === 'week'
      ? `Week ${formatDisplayDate(startISO)} to ${formatDisplayDate(endISO)}`
      : (range as ReturnType<typeof getMonthRange>).label;

  const rangedRecords = records
    .filter((r) => isDateInRange(r.date, startISO, endISO))
    .filter((r) => (roleFilter === 'all' ? true : r.employeeRole === roleFilter));

  const dates = eachDateInRange(startISO, endISO);
  const matrixRows: DetailRow[] = [];
  let sno = 1;
  dates.forEach((date) => {
    const dayRows = buildDayRows(filteredEmployees, records, date, 'all');
    dayRows.forEach((row) => {
      matrixRows.push(
        makeDetailRow(
          sno++,
          date,
          row.employee.name,
          row.employee.contact,
          row.employee.role,
          row.status,
          row.record?.entryTime || '',
          row.record?.exitTime || ''
        )
      );
    });
  });

  const markedOnly = toDetailRowsFromRecords(rangedRecords);
  const employeeSummary = buildEmployeeSummary(
    filteredEmployees,
    rangedRecords,
    startISO,
    endISO
  );
  const dayWise = buildDayWiseSummary(filteredEmployees, records, startISO, endISO);

  const present = rangedRecords.filter((r) => r.status === 'Present').length;
  const absent = rangedRecords.filter((r) => r.status === 'Absent').length;

  const fileKey =
    period === 'week'
      ? `week_${startISO}_to_${endISO}`
      : `month_${(range as ReturnType<typeof getMonthRange>).monthKey}`;

  writeWorkbook(
    [
      {
        name: 'Summary',
        data: [
          ['Nexsahay Attendance Report'],
          ['Report Type', period === 'week' ? 'Week-wise' : 'Month-wise'],
          ['Period', periodLabel],
          ['From Date', formatDisplayDate(startISO)],
          ['To Date', formatDisplayDate(endISO)],
          ['Total Employees', filteredEmployees.length],
          ['Total Days', dates.length],
          ['Marked Present', present],
          ['Marked Absent', absent],
          ['Total Detail Rows', matrixRows.length],
          ...standardTimingRows(),
        ],
      },
      {
        name: 'Full Detail',
        data: matrixRows.length ? matrixRows : [EMPTY_DETAIL],
      },
      {
        name: 'Marked Only',
        data: markedOnly.length ? markedOnly : [EMPTY_DETAIL],
      },
      {
        name: 'Employee Summary',
        data: employeeSummary.length ? employeeSummary : [{ 'S.No': '' }],
      },
      {
        name: 'Day-wise Summary',
        data: dayWise.length ? dayWise : [{ Date: '' }],
      },
    ],
    `nexsahay_${period}_${fileKey}.xlsx`
  );

  return { label: periodLabel, count: matrixRows.length };
}

export function buildEmployeeMonthRows(
  employee: Employee,
  records: AttendanceRecord[],
  month: number,
  year: number
) {
  const range = getMonthRange(monthYearToISO(month, year));
  const dates = eachDateInRange(range.startISO, range.endISO);

  return dates.map((date) => {
    const record =
      records.find((r) => r.employeeId === employee.id && r.date === date) ?? null;
    const status = record ? record.status : ('Not Marked' as const);
    return {
      date,
      record,
      status,
      day: formatWeekday(date),
      entryTime: record?.entryTime || '',
      exitTime: record?.exitTime || '',
    };
  });
}

export function exportEmployeeMonthReport(options: {
  employee: Employee;
  records: AttendanceRecord[];
  month: number;
  year: number;
  statusFilter?: 'all' | 'Present' | 'Absent' | 'Not Marked';
}) {
  const { employee, records, month, year, statusFilter = 'all' } = options;
  const range = getMonthRange(monthYearToISO(month, year));
  let rows = buildEmployeeMonthRows(employee, records, month, year);

  if (statusFilter !== 'all') {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  const detail = rows.map((row, index) =>
    makeDetailRow(
      index + 1,
      row.date,
      employee.name,
      employee.contact,
      employee.role,
      row.status,
      row.entryTime,
      row.exitTime
    )
  );

  const allMonthRows = buildEmployeeMonthRows(employee, records, month, year);
  const present = allMonthRows.filter((r) => r.status === 'Present').length;
  const absent = allMonthRows.filter((r) => r.status === 'Absent').length;
  const notMarked = allMonthRows.filter((r) => r.status === 'Not Marked').length;

  const safeName = employee.name.replace(/[^\w.-]+/g, '_');
  writeWorkbook(
    [
      {
        name: 'Summary',
        data: [
          ['Nexsahay Employee Attendance Report'],
          ['Report Type', 'Employee Month Search'],
          ['Employee Name', employee.name],
          ['Contact Number', employee.contact],
          ['Role', employee.role],
          ['Month', range.label],
          ['Year', year],
          ['Status Filter', statusFilter],
          ['Total Days', allMonthRows.length],
          ['Present Days', present],
          ['Absent Days', absent],
          ['Not Marked Days', notMarked],
          ['Rows In Sheet', detail.length],
          ...standardTimingRows(),
        ],
      },
      {
        name: 'Employee Month Detail',
        data: detail.length ? detail : [EMPTY_DETAIL],
      },
    ],
    `nexsahay_employee_${safeName}_${range.monthKey}.xlsx`
  );

  return {
    label: `${employee.name} · ${range.label}`,
    present,
    absent,
    notMarked,
    count: detail.length,
  };
}

export function exportAttendanceToExcel(records: AttendanceRecord[], fileLabel: string) {
  const rows = toDetailRowsFromRecords(records);
  writeWorkbook(
    [
      {
        name: 'Summary',
        data: [
          ['Nexsahay Attendance Report'],
          ['Report Type', 'All Dates'],
          ['Total Records', records.length],
          ['Present', records.filter((r) => r.status === 'Present').length],
          ['Absent', records.filter((r) => r.status === 'Absent').length],
          ...standardTimingRows(),
        ],
      },
      { name: 'Attendance', data: rows.length ? rows : [EMPTY_DETAIL] },
    ],
    `nexsahay_attendance_${fileLabel.replace(/[^\w.-]+/g, '_') || 'all'}.xlsx`
  );
}

export { buildDayRows } from './attendanceRows';
