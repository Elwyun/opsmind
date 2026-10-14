/**
 * OpsMind stores one record per calendar day. All date keys use the
 * `YYYY-MM-DD` form and are interpreted in UTC so that a key never shifts
 * because of the local timezone.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateKey(key: string): Date {
  if (!isDateKey(key)) {
    throw new Error(`Invalid date key: ${key}`);
  }
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function compareDateKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Inclusive list of date keys from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const keys: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
    if (guard > 3660) break; // safety valve: never loop more than ~10 years
  }
  return keys;
}
