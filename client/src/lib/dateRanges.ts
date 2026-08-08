/** Parse YYYY-MM-DD as local date (avoids UTC shift). */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDisplayDate(iso: string) {
  return parseISODate(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatWeekday(iso: string) {
  return parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'long' });
}

export function formatMonthName(iso: string) {
  return parseISODate(iso).toLocaleDateString('en-IN', { month: 'long' });
}

export function getYear(iso: string) {
  return parseISODate(iso).getFullYear();
}

/** ISO-like week number for Monday-start weeks. */
export function getWeekNumber(iso: string) {
  const { startISO } = getWeekRange(iso);
  const start = parseISODate(startISO);
  const yearStart = new Date(start.getFullYear(), 0, 1);
  const diffDays = Math.floor((start.getTime() - yearStart.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

export function monthYearToISO(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

/** Monday-start week containing the given date. */
export function getWeekRange(iso: string) {
  const date = parseISODate(iso);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startISO: toISODate(start), endISO: toISODate(end) };
}

export function getMonthRange(iso: string) {
  const date = parseISODate(iso);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startISO: toISODate(start),
    endISO: toISODate(end),
    label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  };
}

export function eachDateInRange(startISO: string, endISO: string) {
  const dates: string[] = [];
  const cursor = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function isDateInRange(iso: string, startISO: string, endISO: string) {
  return iso >= startISO && iso <= endISO;
}

/** Working hours between HH:mm times; empty if invalid. */
export function calcWorkingHours(entryTime: string, exitTime: string) {
  if (!entryTime || !exitTime) return '';
  const [eh, em] = entryTime.split(':').map(Number);
  const [xh, xm] = exitTime.split(':').map(Number);
  const mins = xh * 60 + xm - (eh * 60 + em);
  if (mins < 0 || Number.isNaN(mins)) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
