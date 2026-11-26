import { STATUS_META } from "../lib/status-meta";
import type { ComponentStatus } from "../types";

/** Colour key for the uptime bars and status badges (labels as in the design). */
const ITEMS: { status: ComponentStatus; label: string }[] = [
  { status: "operational", label: "Operational" },
  { status: "degraded", label: "Slow" },
  { status: "partial_outage", label: "Partial outage" },
  { status: "major_outage", label: "Outage" },
];

export function StatusLegend() {
  return (
    <ul aria-label="Status colour key" className="flex min-w-0 flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-muted">
      {ITEMS.map(({ status, label }) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: STATUS_META[status].color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}
