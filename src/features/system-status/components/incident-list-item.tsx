import Link from "next/link";
import { formatDuration } from "../lib/format";
import { PHASE_LABEL, SEVERITY_META } from "../lib/status-meta";
import type { Incident } from "../types";
import { StatusIcon } from "./status-pill";
import { LocalDateTime } from "./time";

/** Compact incident summary used in past-incident and history lists. */
export function IncidentListItem({ incident }: { incident: Incident }) {
  const sev = SEVERITY_META[incident.severity];
  const latest = incident.updates[0];
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <Link href={`/incidents/${incident.id}`} className="group block rounded-lg">
        <p className="flex items-start gap-2 font-medium text-foreground group-hover:text-link">
          <StatusIcon status={incident.phase === "resolved" ? "operational" : sev.status} className="mt-0.5 size-4 shrink-0" />
          <span>{incident.title}</span>
        </p>
        {latest && <p className="mt-1 line-clamp-2 pl-6 text-sm text-secondary">{latest.body}</p>}
        <p className="mt-1 pl-6 text-xs text-muted">
          {sev.label} · {PHASE_LABEL[incident.phase]} · <LocalDateTime iso={incident.startedAt} />
          {incident.resolvedAt && <> · lasted {formatDuration(incident.startedAt, incident.resolvedAt)}</>}
        </p>
      </Link>
    </li>
  );
}
