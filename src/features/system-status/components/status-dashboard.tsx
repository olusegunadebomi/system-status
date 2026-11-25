"use client";

import { useStatusSummary, useUptime, type UptimePayload } from "../hooks/use-status";
import type { StatusSummary } from "../types";
import { SectionHeading } from "./card";
import { ComponentGroups } from "./component-groups";
import { ActiveIncidentCard, MaintenanceCard } from "./incident-cards";
import { BackendUnavailable, ErrorState, OfflineBadge } from "./notices";
import { OverallBanner } from "./overall-banner";

interface Props {
  initialSummary: StatusSummary;
  initialUptime: UptimePayload;
  names: Record<string, string>;
}

/** Live part of the page: server-rendered with initial data, then polled. */
export function StatusDashboard({ initialSummary, initialUptime, names }: Props) {
  const summary = useStatusSummary(initialSummary);
  const uptime = useUptime(initialUptime);
  const data = summary.data;

  return (
    <>
      <div className="space-y-2 empty:hidden">
        <OfflineBadge />
        {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}
        {!data.incidentsAvailable && <BackendUnavailable />}
      </div>

      <OverallBanner summary={data} refreshing={summary.isFetching} />

      {data.activeIncidents.length > 0 && (
        <section aria-labelledby="active-heading">
          <SectionHeading id="active-heading">Active incidents</SectionHeading>
          <div className="space-y-3">
            {data.activeIncidents.map((i) => (
              <ActiveIncidentCard key={i.id} incident={i} names={names} />
            ))}
          </div>
        </section>
      )}

      {data.upcomingMaintenance.length > 0 && (
        <section aria-labelledby="maintenance-heading">
          <SectionHeading id="maintenance-heading">Scheduled maintenance</SectionHeading>
          <div className="space-y-3">
            {data.upcomingMaintenance.map((m) => (
              <MaintenanceCard key={m.id} maintenance={m} names={names} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="components-heading">
        <SectionHeading id="components-heading">Components</SectionHeading>
        <ComponentGroups groups={data.groups} uptime={uptime.data?.uptime} incidents={uptime.data?.incidents ?? {}} />
      </section>
    </>
  );
}
