import { PHASE_LABEL } from "../lib/status-meta";
import type { IncidentUpdate } from "../types";
import { LocalDateTime } from "./time";

const PHASE_DOT: Record<IncidentUpdate["phase"], string> = {
  investigating: "var(--status-major)",
  identified: "var(--status-partial)",
  monitoring: "var(--color-primary-500)",
  resolved: "var(--status-operational)",
};

/** Newest-first list of updates for an incident. */
export function IncidentTimeline({ updates }: { updates: IncidentUpdate[] }) {
  if (updates.length === 0) return <p className="text-sm text-muted">No updates posted yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {updates.map((u) => (
        <li key={u.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-grouped-card"
            style={{ background: PHASE_DOT[u.phase] }}
          />
          <p className="text-sm">
            <span className="font-semibold text-foreground">{PHASE_LABEL[u.phase]}</span>
            <span className="text-muted"> · </span>
            <span className="text-muted">
              <LocalDateTime iso={u.createdAt} />
            </span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-secondary">{u.body}</p>
        </li>
      ))}
    </ol>
  );
}
