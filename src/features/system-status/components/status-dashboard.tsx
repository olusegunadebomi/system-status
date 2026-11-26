"use client";

import { useStatusSummary, useUptime, type UptimePayload } from "../hooks/use-status";
import type { StatusSummary } from "../types";
import { HeaderBand, SectionHeading } from "./card";
import { ComponentGroups } from "./component-groups";
import { ActiveIncidentCard, MaintenanceCard } from "./incident-cards";
import { BackendUnavailable, ErrorState, OfflineBadge } from "./notices";
import { OverallBanner } from "./overall-banner";
import { StatusLegend } from "./status-legend";

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
      {/* First on the page so it joins the navy header, whatever the status. */}
      <HeaderBand>
        <OverallBanner summary={data} refreshing={summary.isFetching} />
      </HeaderBand>

      <div className="space-y-2 empty:hidden">
        <OfflineBadge />
        {summary.isError && <ErrorState onRetry={() => summary.refetch()} />}
        {!data.incidentsAvailable && <BackendUnavailable />}
      </div>

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
        <SectionHeading id="components-heading" action={<StatusLegend />}>
          Components
        </SectionHeading>
        <ComponentGroups groups={data.groups} uptime={uptime.data?.uptime} incidents={uptime.data?.incidents ?? {}} />
      </section>
    </>
  );
}
