import { formatDistanceStrict, intervalToDuration } from "date-fns";

/**
 * Formatting helpers. Pass `timeZone: "UTC"` for server/hydration renders and
 * leave it undefined in the browser to use the viewer's local zone.
 */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone?: string, withZone = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    ...(withZone ? { timeZoneName: "short" } : {}),
  }).format(new Date(iso));
}

export function formatDay(isoOrDate: string, timeZone?: string): string {
  // Plain YYYY-MM-DD dates are calendar days: always format them in UTC.
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: plain ? "UTC" : timeZone,
  }).format(new Date(plain ? `${isoOrDate}T00:00:00Z` : isoOrDate));
}

export function formatMonth(yyyyMm: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${yyyyMm}-01T00:00:00Z`),
  );
}

export function formatDuration(startIso: string, endIso: string): string {
  const d = intervalToDuration({ start: new Date(startIso), end: new Date(endIso) });
  const parts: string[] = [];
  if (d.days) parts.push(`${d.days}d`);
  if (d.hours) parts.push(`${d.hours}h`);
  if (d.minutes || parts.length === 0) parts.push(`${d.minutes ?? 0}m`);
  return parts.join(" ");
}

export function relative(iso: string, now: number): string {
  const diff = now - Date.parse(iso);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  return `${formatDistanceStrict(new Date(iso), new Date(now))} ago`;
}

export function formatPct(pct: number): string {
  if (pct >= 100) return "100%";
  // Never round 99.995 up to a misleading 100.00%
  return `${(Math.floor(pct * 100) / 100).toFixed(2)}%`;
}
