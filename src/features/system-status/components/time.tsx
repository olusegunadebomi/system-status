"use client";

import { useHydrated, useNow } from "../hooks/use-client-env";
import { formatDateTime, formatTime, relative } from "../lib/format";

/**
 * Renders an absolute date/time. The server and the hydration pass render
 * UTC; after hydration it switches to the viewer's local timezone. This
 * avoids hydration mismatches.
 */
export function LocalDateTime({ iso, timeOnly = false, withZone = true }: { iso: string; timeOnly?: boolean; withZone?: boolean }) {
  const hydrated = useHydrated();
  const tz = hydrated ? undefined : "UTC";
  const text = timeOnly ? formatTime(iso, tz, withZone) : formatDateTime(iso, tz);
  return <time dateTime={iso}>{text}</time>;
}

/** "12s ago" style text that ticks. Shows the absolute time in a tooltip. */
export function RelativeTime({ iso, intervalMs = 1000 }: { iso: string; intervalMs?: number }) {
  const now = useNow(intervalMs);
  const hydrated = useHydrated();
  const absolute = formatDateTime(iso, hydrated ? undefined : "UTC");
  return (
    <time dateTime={iso} title={absolute}>
      {now === null ? absolute : relative(iso, now)}
    </time>
  );
}
