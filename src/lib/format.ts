/**
 * Display formatters. Pure and dependency-free so they can be used by the
 * analysis engine (to build human-readable formulas) and by the UI.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(value: number, currency = "IDR", decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (currency === "IDR") {
    return `Rp${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatNumber(value, decimals)}%`;
}

export function formatSignedPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, decimals)}%`;
}

export function formatDecimal(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/** `2026-09-17` -> `17 Sep 2026`. Parsed manually to avoid timezone drift. */
export function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.slice(0, 10).split("-");
  const monthLabel = MONTHS[Number(month) - 1] ?? month;
  return `${Number(day)} ${monthLabel} ${year}`;
}

export function formatUnitCount(value: number): string {
  return `${formatNumber(value)} units`;
}

export function formatKwh(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)} kWh`;
}
