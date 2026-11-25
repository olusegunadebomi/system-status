import type { Metadata } from "next";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/features/system-status/components/card";
import { IncidentListItem } from "@/features/system-status/components/incident-list-item";
import { ListSkeleton } from "@/features/system-status/components/skeletons";
import { formatMonth } from "@/features/system-status/lib/format";
import { listIncidents } from "@/features/system-status/lib/status-service";

export const metadata: Metadata = {
  title: "Incident history",
  description: "A month-by-month history of incidents affecting Golvia services.",
  alternates: { canonical: "/history" },
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const PAGE_SIZE = 20;

function shiftMonth(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function HistoryPage(props: PageProps<"/history">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:text-link-hover">
        <ArrowLeft aria-hidden className="size-4" /> Current status
      </Link>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Incident history</h1>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <MonthHistory searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function MonthHistory({ searchParams }: Pick<PageProps<"/history">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const current = new Date().toISOString().slice(0, 7);
  const monthParam = typeof sp.month === "string" ? sp.month : undefined;
  const month = monthParam && MONTH_RE.test(monthParam) && monthParam <= current ? monthParam : current;
  const page = Math.max(0, Number.parseInt(typeof sp.page === "string" ? sp.page : "0", 10) || 0);

  const from = `${month}-01T00:00:00.000Z`;
  const to = `${shiftMonth(month, 1)}-01T00:00:00.000Z`;
  const result = await listIncidents({ from, to, page, size: PAGE_SIZE });
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = month < current ? shiftMonth(month, 1) : null;

  return (
    <section aria-labelledby="month-heading" className="space-y-4">
      <nav aria-label="Month" className="flex items-center justify-between gap-2">
        <Link href={`/history?month=${prevMonth}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-grouped-card px-3 py-1.5 text-sm font-medium text-secondary hover:text-foreground">
          <ChevronLeft aria-hidden className="size-4" />
          <span>{formatMonth(prevMonth)}</span>
        </Link>
        <h2 id="month-heading" className="text-center font-semibold text-foreground">
          {formatMonth(month)}
        </h2>
        {nextMonth ? (
          <Link href={`/history?month=${nextMonth}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-grouped-card px-3 py-1.5 text-sm font-medium text-secondary hover:text-foreground">
            <span>{formatMonth(nextMonth)}</span>
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <span className="w-24" aria-hidden />
        )}
      </nav>

      <Card className="p-4 sm:p-5">
        {result === null ? (
          <p className="text-sm text-muted">Incident history is temporarily unavailable. Please try again shortly.</p>
        ) : result.items.length === 0 ? (
          <p className="text-sm text-muted">No incidents reported in {formatMonth(month)}.</p>
        ) : (
          <ul className="divide-y divide-divider">
            {result.items.map((i) => (
              <IncidentListItem key={i.id} incident={i} />
            ))}
          </ul>
        )}
      </Card>

      {result && totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
          {page > 0 && (
            <Link href={`/history?month=${month}&page=${page - 1}`} className="font-medium text-link hover:text-link-hover">
              Newer
            </Link>
          )}
          <span className="text-muted">
            Page {page + 1} of {totalPages}
          </span>
          {page + 1 < totalPages && (
            <Link href={`/history?month=${month}&page=${page + 1}`} className="font-medium text-link hover:text-link-hover">
              Older
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
