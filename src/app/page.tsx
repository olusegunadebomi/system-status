import { connection } from "next/server";
import { Suspense } from "react";
import { ListSkeleton, DashboardSkeleton } from "@/features/system-status/components/skeletons";
import { PastIncidents } from "@/features/system-status/components/past-incidents";
import { StatusDashboard } from "@/features/system-status/components/status-dashboard";
import { getComponentNames, getStatusSummary, getUptimePayload } from "@/features/system-status/lib/status-service";

/**
 * The static shell (header, headings, skeletons, footer) is prerendered.
 * Live status streams in per request from the 30s in-memory probe cache, so
 * the first paint is server-rendered and current. The client then polls.
 */
export default function StatusPage() {
  return (
    <div className="space-y-8">
      <h1 className="sr-only">Golvia system status</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <LiveStatus />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <PastIncidents />
      </Suspense>
    </div>
  );
}

async function LiveStatus() {
  await connection();
  const [summary, uptime] = await Promise.all([getStatusSummary(), getUptimePayload()]);
  return (
    <div className="space-y-8">
      <StatusDashboard initialSummary={summary} initialUptime={uptime} names={getComponentNames()} />
    </div>
  );
}
