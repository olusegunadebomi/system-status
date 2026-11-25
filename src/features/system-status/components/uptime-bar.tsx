"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useMediaQuery } from "../hooks/use-client-env";
import { formatDay, formatPct } from "../lib/format";
import { STATUS_META } from "../lib/status-meta";
import type { DailyUptime, IncidentRef } from "../types";

const TOTAL = 90;

interface Props {
  componentName: string;
  days: (DailyUptime | null)[] | undefined;
  incidents: Record<string, IncidentRef>;
}

/** Pad/trim to exactly 90 entries; missing days render as "no data". */
function normalise(days: (DailyUptime | null)[] | undefined): (DailyUptime | null)[] {
  const list = (days ?? []).slice(-TOTAL);
  return [...Array<null>(TOTAL - list.length).fill(null), ...list];
}

export function UptimeBar({ componentName, days, incidents }: Props) {
  const bars = normalise(days);
  const tiny = useMediaQuery("(max-width: 399px)");
  const mobile = useMediaQuery("(max-width: 639px)");
  const visible = tiny ? 30 : mobile ? 60 : 90;
  const minIndex = TOTAL - visible;

  const [focusIndex, setFocusIndex] = useState(TOTAL - 1);
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipId = useId();

  const roving = Math.max(focusIndex, minIndex);

  // Close a pinned tooltip on outside tap.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPinned(false);
        setActive(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pinned]);

  const withData = bars.filter((b): b is DailyUptime => b !== null);
  const avg = withData.length ? withData.reduce((s, d) => s + d.uptimePct, 0) / withData.length : null;

  const move = (to: number) => {
    const i = Math.min(TOTAL - 1, Math.max(minIndex, to));
    setFocusIndex(i);
    setActive(i);
    barRefs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(roving - 1),
      ArrowRight: () => move(roving + 1),
      Home: () => move(minIndex),
      End: () => move(TOTAL - 1),
      Escape: () => {
        setPinned(false);
        setActive(null);
      },
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const shown = active !== null && active >= minIndex ? active : null;
  const day = shown !== null ? bars[shown] : null;
  const pct = shown !== null ? ((shown - minIndex) / (visible - 1)) * 100 : 0;
  const align = pct < 20 ? "translate-x-0" : pct > 80 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseLeave={() => !pinned && setActive(null)}
      onBlur={(e) => {
        if (!pinned && !rootRef.current?.contains(e.relatedTarget as Node)) setActive(null);
      }}
    >
      <div
        role="group"
        aria-label={`Daily uptime for ${componentName}, last ${visible} days. Use arrow keys to move between days.`}
        onKeyDown={onKeyDown}
        className="flex h-8 items-stretch gap-0.5 [&>button]:min-w-0 [&>button]:flex-1 [&>button]:cursor-pointer [&>button]:rounded-xs [&>button]:transition-opacity [&>button:hover]:opacity-70 [&>button:focus-visible]:outline-offset-1"
      >
        {bars.map((d, i) => {
          const status = d?.worstStatus ?? "unknown";
          const hide = i < 30 ? "max-sm:hidden" : i < 60 ? "max-[399px]:hidden" : undefined;
          // Only the focusable bar carries a label (screen readers announce it on
          // focus); this keeps ~2,600 long attributes out of the HTML.
          const label =
            i !== roving
              ? undefined
              : d
                ? `${formatDay(d.date)}: ${formatPct(d.uptimePct)} uptime, ${STATUS_META[status].label}${d.incidentIds.length ? `, ${d.incidentIds.length} incident${d.incidentIds.length > 1 ? "s" : ""}` : ""}`
                : "No data for this day";
          return (
            <button
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              type="button"
              tabIndex={i === roving ? 0 : -1}
              aria-label={label}
              aria-describedby={shown === i ? tooltipId : undefined}
              aria-expanded={shown === i && pinned ? true : undefined}
              onMouseEnter={() => !pinned && setActive(i)}
              onFocus={() => {
                setFocusIndex(i);
                if (!pinned) setActive(i);
              }}
              onClick={() => {
                if (pinned && active === i) {
                  setPinned(false);
                } else {
                  setActive(i);
                  setFocusIndex(i);
                  setPinned(true);
                }
              }}
              className={shown === i ? `${hide ?? ""} opacity-70` : hide}
              style={{ background: STATUS_META[status].color }}
            />
          );
        })}
      </div>

      {shown !== null && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] ${align} rounded-xl border border-border bg-grouped-card p-3 text-sm shadow-lg`}
          style={{ left: `${pct}%` }}
        >
          {day ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{formatDay(day.date)}</span>
                <span className="text-muted">{formatPct(day.uptimePct)}</span>
              </div>
              <DayStatus status={day.worstStatus} />
              {day.incidentIds.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-divider pt-2">
                  {day.incidentIds.map((id) => (
                    <li key={id}>
                      <Link href={`/incidents/${id}`} className="text-link underline-offset-2 hover:text-link-hover hover:underline">
                        {incidents[id]?.title ?? "View incident"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted">No incidents recorded</p>
              )}
            </>
          ) : (
            <p className="text-muted">No data for this day</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          <span className="max-sm:hidden">90 days ago</span>
          <span className="hidden min-[400px]:max-sm:inline">60 days ago</span>
          <span className="hidden max-[399px]:inline">30 days ago</span>
        </span>
        <span className="font-medium text-secondary">{avg === null ? "No data" : `${formatPct(avg)} uptime`}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function DayStatus({ status }: { status: DailyUptime["worstStatus"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-secondary">
      <Icon aria-hidden className="size-3.5" style={{ color: meta.color }} strokeWidth={2.5} />
      {meta.label}
    </p>
  );
}
