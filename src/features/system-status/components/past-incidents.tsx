import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { formatDay } from "../lib/format";
import { getRecentIncidentsByDay } from "../lib/status-service";
import { Card, SectionHeading } from "./card";
import { IncidentListItem } from "./incident-list-item";

export async function PastIncidents() {
  await connection();
  const days = await getRecentIncidentsByDay(14);

  return (
    <section aria-labelledby="past-heading">
      <SectionHeading
        id="past-heading"
        action={
          <Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-link hover:text-link-hover">
            Incident history <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      >
        Past incidents
      </SectionHeading>
      {days === null ? (
        <Card className="p-5 text-sm text-muted">Incident history is temporarily unavailable.</Card>
      ) : (
        <Card>
          <ol className="divide-y divide-border">
            {days.map(([day, incidents]) => (
              <li key={day} className="px-4 py-4 sm:px-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">{formatDay(day)}</h3>
                {incidents.length === 0 ? (
                  <p className="text-sm text-muted">No incidents reported.</p>
                ) : (
                  <ul className="divide-y divide-divider">
                    {incidents.map((i) => (
                      <IncidentListItem key={i.id} incident={i} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}
