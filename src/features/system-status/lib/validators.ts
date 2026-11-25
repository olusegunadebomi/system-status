import type {
  ComponentStatus,
  DailyUptime,
  Incident,
  IncidentPhase,
  IncidentUpdate,
  Maintenance,
  Severity,
  UptimeMap,
} from "../types";

const STATUSES: readonly ComponentStatus[] = [
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "maintenance",
  "unknown",
];
const SEVERITIES: readonly Severity[] = ["minor", "major", "critical", "maintenance"];
const PHASES: readonly IncidentPhase[] = ["investigating", "identified", "monitoring", "resolved"];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && list.includes(v as T);

export function isIncidentUpdate(v: unknown): v is IncidentUpdate {
  return isObj(v) && isStr(v.id) && oneOf(PHASES, v.phase) && typeof v.body === "string" && isDate(v.createdAt);
}

export function isIncident(v: unknown): v is Incident {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    oneOf(SEVERITIES, v.severity) &&
    oneOf(PHASES, v.phase) &&
    isStrArr(v.componentIds) &&
    isDate(v.startedAt) &&
    (v.resolvedAt === undefined || v.resolvedAt === null || isDate(v.resolvedAt)) &&
    Array.isArray(v.updates)
  );
}

/** Normalise an incident: drop malformed updates, sort newest first. */
export function normaliseIncident(v: Incident): Incident {
  const updates = v.updates.filter(isIncidentUpdate).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    id: v.id,
    title: v.title,
    severity: v.severity,
    phase: v.phase,
    componentIds: v.componentIds,
    startedAt: v.startedAt,
    resolvedAt: v.resolvedAt ?? undefined,
    updates,
  };
}

export function isMaintenance(v: unknown): v is Maintenance {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    typeof v.body === "string" &&
    isStrArr(v.componentIds) &&
    isDate(v.scheduledStart) &&
    isDate(v.scheduledEnd) &&
    oneOf(["scheduled", "in_progress", "completed"] as const, v.status)
  );
}

export function isDailyUptime(v: unknown): v is DailyUptime {
  return (
    isObj(v) &&
    isStr(v.date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    isNum(v.uptimePct) &&
    oneOf(STATUSES, v.worstStatus) &&
    isStrArr(v.incidentIds)
  );
}

/** Keep valid items, log and drop the rest. Never throws. */
export function filterValid<T>(input: unknown, guard: (v: unknown) => v is T, label: string): T[] {
  if (!Array.isArray(input)) {
    if (input !== undefined) console.warn(JSON.stringify({ msg: "invalid_payload", label, reason: "not_array" }));
    return [];
  }
  const out: T[] = [];
  let dropped = 0;
  for (const item of input) {
    if (guard(item)) out.push(item);
    else dropped++;
  }
  if (dropped) console.warn(JSON.stringify({ msg: "invalid_payload", label, dropped }));
  return out;
}

export function parseUptimeMap(input: unknown): UptimeMap {
  if (!isObj(input)) return {};
  const out: UptimeMap = {};
  for (const [id, days] of Object.entries(input)) out[id] = filterValid(days, isDailyUptime, `uptime.${id}`);
  return out;
}

/** Many Golvia endpoints wrap payloads in `{ data: … }`; accept both shapes. */
export function unwrap(body: unknown): unknown {
  return isObj(body) && "data" in body ? body.data : body;
}
