import { CircleCheck, CircleHelp, OctagonX, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import type { ComponentStatus, IncidentPhase, Severity } from "../types";

export interface StatusMeta {
  label: string;
  /** Short label for tight spaces (compact pills on phones) */
  short: string;
  /** Headline used in the overall banner */
  headline: string;
  icon: LucideIcon;
  /** CSS colour (a var) for icons, dots and bars */
  color: string;
  /** Foreground to use on top of a solid `color` fill (yellow needs dark text) */
  onColor: string;
}

export const STATUS_META: Record<ComponentStatus, StatusMeta> = {
  operational: {
    label: "Operational",
    short: "OK",
    headline: "All systems operational",
    icon: CircleCheck,
    color: "var(--status-operational)",
    onColor: "#ffffff",
  },
  degraded: {
    label: "Degraded performance",
    short: "Degraded",
    headline: "Some systems are running slowly",
    icon: TriangleAlert,
    color: "var(--status-degraded)",
    onColor: "#1e1e1e",
  },
  partial_outage: {
    label: "Partial outage",
    short: "Partial",
    headline: "Some systems are experiencing issues",
    icon: TriangleAlert,
    color: "var(--status-partial)",
    onColor: "#ffffff",
  },
  major_outage: {
    label: "Major outage",
    short: "Outage",
    headline: "Major outage in progress",
    icon: OctagonX,
    color: "var(--status-major)",
    onColor: "#ffffff",
  },
  maintenance: {
    label: "Under maintenance",
    short: "Maintenance",
    headline: "Scheduled maintenance in progress",
    icon: Wrench,
    color: "var(--status-maintenance)",
    onColor: "#ffffff",
  },
  unknown: {
    label: "No data",
    short: "No data",
    headline: "Checking system status…",
    icon: CircleHelp,
    color: "var(--status-nodata)",
    onColor: "var(--foreground)",
  },
};

export const SEVERITY_META: Record<Severity, { label: string; status: ComponentStatus }> = {
  minor: { label: "Minor", status: "degraded" },
  major: { label: "Major", status: "partial_outage" },
  critical: { label: "Critical", status: "major_outage" },
  maintenance: { label: "Maintenance", status: "maintenance" },
};

export const PHASE_LABEL: Record<IncidentPhase, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

/** Short form for document.title */
export const TITLE_PREFIX: Record<ComponentStatus, string> = {
  operational: "",
  degraded: "⚠ Degraded · ",
  partial_outage: "⚠ Partial outage · ",
  major_outage: "⛔ Major outage · ",
  maintenance: "🔧 Maintenance · ",
  unknown: "",
};
