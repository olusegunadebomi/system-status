"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { STATUS_META, TITLE_PREFIX } from "../lib/status-meta";
import type { CompactUptime, IncidentRef, StatusSummary } from "../types";

const http = axios.create({ timeout: 10_000 });

export const statusKeys = {
  summary: ["status", "summary"] as const,
  uptime: ["status", "uptime"] as const,
};

export interface UptimePayload {
  uptime: CompactUptime | null;
  incidents: Record<string, IncidentRef>;
}

export function useStatusSummary(initialData: StatusSummary) {
  const query = useQuery({
    queryKey: statusKeys.summary,
    queryFn: async () => (await http.get<StatusSummary>("/api/status")).data,
    initialData,
    // initialData is the server render: fresh for 30s, then poll.
    initialDataUpdatedAt: Date.parse(initialData.updatedAt),
    staleTime: 15_000,
    refetchInterval: 30_000, // pauses automatically while the tab is hidden
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 15_000),
  });

  useStatusChangeEffects(query.data.overall);
  return query;
}

/** Toast and update document.title when the overall status changes while the page is open. */
function useStatusChangeEffects(overall: StatusSummary["overall"]) {
  const previous = useRef(overall);
  const baseTitle = useRef<string | null>(null);

  useEffect(() => {
    baseTitle.current ??= document.title.replace(/^(⚠|⛔|🔧)[^·]*·\s*/, "");
    document.title = `${TITLE_PREFIX[overall]}${baseTitle.current}`;

    if (previous.current !== overall) {
      const meta = STATUS_META[overall];
      if (overall === "operational") toast.success(meta.headline);
      else if (overall === "major_outage") toast.error(meta.headline);
      else toast.warning(meta.headline);
      previous.current = overall;
    }
  }, [overall]);
}

export function useUptime(initialData?: UptimePayload) {
  return useQuery({
    queryKey: statusKeys.uptime,
    queryFn: async () => (await http.get<UptimePayload>("/api/status/uptime")).data,
    initialData,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
