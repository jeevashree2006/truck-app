/** Formatting + small date helpers used across screens. */

/** Format a number as Indian-rupee currency (no decimals by default). */
export function formatCurrency(value: number | null | undefined, decimals = 0): string {
  const n = value ?? 0;
  const formatted = n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `₹${formatted}`;
}

/** Compact currency for KPI cards: ₹1.2L, ₹85.0k, ₹540. */
export function formatCompactCurrency(value: number | null | undefined): string {
  const n = value ?? 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('en-IN');
}

export function formatKm(value: number | null | undefined): string {
  return `${formatNumber(value)} km`;
}

/** Parse an ISO date (YYYY-MM-DD or full ISO) into a Date, or null. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Human-friendly date: 12 Jun 2026. */
export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Short date for dense lists: 12 Jun. */
export function formatShortDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Convert a Date to the API's YYYY-MM-DD format. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days between now and a target date (negative if in the past). */
export function daysUntil(value: string | null | undefined): number | null {
  const d = parseDate(value);
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
