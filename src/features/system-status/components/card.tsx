import type { ReactNode } from "react";

export function Card({ children, className = "", as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return <As className={`rounded-2xl border border-border bg-grouped-card ${className}`}>{children}</As>;
}

/**
 * Extends the navy header down behind the top half of its child, so the
 * overall-status card looks joined to the header. Full-bleed: spans the whole
 * viewport width (body clips the horizontal overflow). The negative top cancels
 * <main>'s top padding (py-6 / sm:py-10) so the band meets the header.
 */
export function HeaderBand({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="absolute -top-6 bottom-1/2 left-1/2 -z-10 w-screen -translate-x-1/2 bg-header sm:-top-10" />
      {children}
    </div>
  );
}

export function SectionHeading({ id, children, action }: { id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-fill-strong/70 ${className}`} />;
}
