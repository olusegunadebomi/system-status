import type { ReactNode } from "react";

export function Card({ children, className = "", as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return <As className={`rounded-2xl border border-border bg-grouped-card ${className}`}>{children}</As>;
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
