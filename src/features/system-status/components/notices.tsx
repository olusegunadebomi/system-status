"use client";

import { CircleAlert, RefreshCw, WifiOff } from "lucide-react";
import { useOffline } from "../hooks/use-client-env";

export function OfflineBadge() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-grouped-card px-3 py-2 text-sm text-secondary">
      <WifiOff aria-hidden className="size-4 text-muted" />
      You&apos;re offline. Showing the last known status.
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-xl border border-border bg-grouped-card px-3 py-2 text-sm text-secondary">
      <RefreshCw aria-hidden className="size-4 animate-spin text-muted" />
      <span className="flex-1">Unable to load status, retrying…</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium text-link hover:text-link-hover">
          Retry now
        </button>
      )}
    </div>
  );
}

export function BackendUnavailable() {
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-border bg-grouped-card px-3 py-2 text-sm text-secondary">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
      Incident details are temporarily unavailable. Live component checks below are still up to date.
    </div>
  );
}
