import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { SEVERITY_META } from "../lib/status-meta";
import type { Incident, Maintenance } from "../types";
import { Card } from "./card";
import { IncidentTimeline } from "./incident-timeline";
import { SeverityChip } from "./status-pill";
import { LocalDateTime } from "./time";

function AffectedList({ ids, names }: { ids: string[]; names: Record<string, string> }) {
  if (ids.length === 0) return null;
  return (
    <p className="text-sm text-muted">
      <span className="font-medium text-secondary">Affected: </span>
      {ids.map((id) => names[id] ?? id).join(", ")}
    </p>
  );
}

export function ActiveIncidentCard({ incident, names }: { incident: Incident; names: Record<string, string> }) {
  const sev = SEVERITY_META[incident.severity];
  return (
    <Card as="article" className="overflow-hidden">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            <Link href={`/incidents/${incident.id}`} className="hover:text-link hover:underline">
              {incident.title}
            </Link>
          </h3>
          <SeverityChip status={sev.status} label={sev.label} />
        </div>
        <AffectedList ids={incident.componentIds} names={names} />
        <IncidentTimeline updates={incident.updates} />
      </div>
    </Card>
  );
}

export function MaintenanceCard({ maintenance, names }: { maintenance: Maintenance; names: Record<string, string> }) {
  const inProgress = maintenance.status === "in_progress";
  return (
    <Card as="article" className="overflow-hidden">
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">{maintenance.title}</h3>
          <SeverityChip status="maintenance" label={inProgress ? "In progress" : "Scheduled"} />
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-secondary">
          <CalendarClock aria-hidden className="size-4 text-status-maintenance" />
          <LocalDateTime iso={maintenance.scheduledStart} />
          <span aria-hidden>–</span>
          <span className="sr-only">to</span>
          <LocalDateTime iso={maintenance.scheduledEnd} />
        </p>
        <p className="text-sm leading-relaxed text-secondary">{maintenance.body}</p>
        <AffectedList ids={maintenance.componentIds} names={names} />
      </div>
    </Card>
  );
}
