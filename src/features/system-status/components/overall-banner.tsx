"use client";

import { RefreshCw } from "lucide-react";
import { STATUS_META } from "../lib/status-meta";
import type { StatusSummary } from "../types";
import { RelativeTime } from "./time";

export function OverallBanner({ summary, refreshing }: { summary: StatusSummary; refreshing: boolean }) {
  const meta = STATUS_META[summary.overall];
  const Icon = meta.icon;
  const affected = summary.groups.flatMap((g) => g.components).filter((c) => c.status !== "operational" && c.status !== "unknown");

  return (
    <section
      aria-labelledby="overall-heading"
      className="overflow-hidden rounded-2xl border bg-grouped-card shadow-lg shadow-slate-900/5 dark:shadow-none"
      style={{
        // Neutral card when all is well; a status-tinted edge only when something is wrong.
        borderColor:
          summary.overall === "operational" || summary.overall === "unknown"
            ? "var(--border)"
            : `color-mix(in srgb, ${meta.color} 50%, var(--border))`,
      }}
    >
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14"
          style={{ background: meta.color, color: meta.onColor }}
        >
          <Icon aria-hidden className="size-7 sm:size-8" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Only the headline is live; the ticking timestamp must not be announced every second. */}
          <div aria-live="polite" aria-atomic="true">
            <h2 id="overall-heading" className="text-xl font-semibold text-foreground sm:text-2xl">
              {meta.headline}
            </h2>
            {summary.overall === "operational" && affected.length === 0 && (
              <p className="mt-0.5 text-sm text-secondary">Everything on Golvia is working normally.</p>
            )}
            {affected.length > 0 && (
              <p className="mt-0.5 text-sm text-secondary">
                {affected.length} component{affected.length === 1 ? "" : "s"} affected:{" "}
                {affected
                  .slice(0, 3)
                  .map((c) => c.name)
                  .join(", ")}
                {affected.length > 3 ? ` and ${affected.length - 3} more` : ""}
              </p>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <RefreshCw aria-hidden className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Updated <RelativeTime iso={summary.updatedAt} />
          </p>
        </div>
      </div>
    </section>
  );
}
