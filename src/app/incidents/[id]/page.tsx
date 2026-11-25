import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/features/system-status/components/card";
import { IncidentTimeline } from "@/features/system-status/components/incident-timeline";
import { ListSkeleton } from "@/features/system-status/components/skeletons";
import { SeverityChip, StatusPill } from "@/features/system-status/components/status-pill";
import { LocalDateTime } from "@/features/system-status/components/time";
import { formatDuration } from "@/features/system-status/lib/format";
import { PHASE_LABEL, SEVERITY_META } from "@/features/system-status/lib/status-meta";
import { getComponentNames, getIncident } from "@/features/system-status/lib/status-service";

export async function generateMetadata({ params }: PageProps<"/incidents/[id]">): Promise<Metadata> {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) return { title: "Incident", robots: { index: false } };
  const latest = incident.updates[0];
  const title = `${incident.title} (${PHASE_LABEL[incident.phase]})`;
  const description = latest?.body ?? `${SEVERITY_META[incident.severity].label} incident affecting Golvia services.`;
  return {
    title,
    description,
    alternates: { canonical: `/incidents/${incident.id}` },
    openGraph: { type: "article", title, description, url: `/incidents/${incident.id}`, publishedTime: incident.startedAt },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function IncidentPage(props: PageProps<"/incidents/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:text-link-hover">
        <ArrowLeft aria-hidden className="size-4" /> Current status
      </Link>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <IncidentDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function IncidentDetail({ params }: Pick<PageProps<"/incidents/[id]">, "params">) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (incident === null) notFound();
  if (incident === undefined) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Incident details unavailable</h1>
        <p className="mt-2 text-secondary">We couldn&apos;t load this incident right now. Please try again in a moment.</p>
      </Card>
    );
  }

  const names = getComponentNames();
  const sev = SEVERITY_META[incident.severity];
  const resolved = incident.phase === "resolved";

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityChip status={sev.status} label={sev.label} />
          <StatusPill status={resolved ? "operational" : sev.status} />
          <span className="sr-only">Current phase:</span>
          <span className="text-sm text-muted">{PHASE_LABEL[incident.phase]}</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{incident.title}</h1>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Started</dt>
          <dd className="text-secondary">
            <LocalDateTime iso={incident.startedAt} />
          </dd>
          {incident.resolvedAt && (
            <>
              <dt className="text-muted">Resolved</dt>
              <dd className="text-secondary">
                <LocalDateTime iso={incident.resolvedAt} /> (lasted {formatDuration(incident.startedAt, incident.resolvedAt)})
              </dd>
            </>
          )}
          <dt className="text-muted">Affected</dt>
          <dd className="text-secondary">{incident.componentIds.map((c) => names[c] ?? c).join(", ") || "Not specified"}</dd>
        </dl>
      </header>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Updates</h2>
        <IncidentTimeline updates={incident.updates} />
      </Card>
    </article>
  );
}
