export type ComponentStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

export type Severity = "minor" | "major" | "critical" | "maintenance";
export type IncidentPhase = "investigating" | "identified" | "monitoring" | "resolved";

export interface StatusComponent {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  status: ComponentStatus;
  /** true when the status comes from an automated check, false when set by the team */
  automated: boolean;
  latencyMs?: number;
  checkedAt: string;
}

export interface ComponentGroup {
  id: string;
  name: string;
  components: StatusComponent[];
  status: ComponentStatus;
}

export interface IncidentUpdate {
  id: string;
  phase: IncidentPhase;
  body: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  phase: IncidentPhase;
  componentIds: string[];
  startedAt: string;
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

export interface Maintenance {
  id: string;
  title: string;
  body: string;
  componentIds: string[];
  scheduledStart: string;
  scheduledEnd: string;
  status: "scheduled" | "in_progress" | "completed";
}

export interface DailyUptime {
  /** YYYY-MM-DD (UTC) */
  date: string;
  uptimePct: number;
  worstStatus: ComponentStatus;
  incidentIds: string[];
}

export interface StatusSummary {
  overall: ComponentStatus;
  groups: ComponentGroup[];
  activeIncidents: Incident[];
  upcomingMaintenance: Maintenance[];
  /** false when the Golvia backend could not be reached for incidents/maintenance */
  incidentsAvailable: boolean;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export type UptimeMap = Record<string, DailyUptime[]>;

/**
 * Wire format for uptime (about 10× smaller than UptimeMap): consecutive days
 * ending at `end` (YYYY-MM-DD). Each day is [uptimePct, statusIndex, ...incidentIds].
 */
export interface CompactUptime {
  end: string;
  days: number;
  components: Record<string, (number | string)[][]>;
}

/** Minimal incident info for the uptime tooltip / past incidents list. */
export interface IncidentRef {
  id: string;
  title: string;
  severity: Severity;
}
