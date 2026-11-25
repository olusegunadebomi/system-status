import { STATUS_META } from "../lib/status-meta";
import type { ComponentStatus } from "../types";

/** Status is always icon + text, never colour alone. */
export function StatusPill({ status, compact = false }: { status: ComponentStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground-soft"
      style={{ borderColor: `color-mix(in srgb, ${meta.color} 45%, var(--border))` }}
    >
      <Icon aria-hidden className="size-3.5" style={{ color: meta.color }} strokeWidth={2.5} />
      {compact ? (
        <>
          <span className="max-sm:hidden">{meta.label}</span>
          <span className="sm:hidden" aria-hidden>
            {meta.short}
          </span>
          <span className="sr-only sm:hidden">{meta.label}</span>
        </>
      ) : (
        meta.label
      )}
    </span>
  );
}

export function StatusIcon({ status, className = "size-4" }: { status: ComponentStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return <Icon aria-label={meta.label} role="img" className={className} style={{ color: meta.color }} strokeWidth={2.5} />;
}

export function SeverityChip({ status, label }: { status: ComponentStatus; label: string }) {
  const meta = STATUS_META[status];
  return (
    // Tinted fill + foreground text keeps AA contrast for every status colour.
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold text-foreground"
      style={{
        background: `color-mix(in srgb, ${meta.color} 18%, var(--grouped-card))`,
        borderColor: `color-mix(in srgb, ${meta.color} 55%, var(--border))`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {label}
    </span>
  );
}
