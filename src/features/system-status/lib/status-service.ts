import "server-only";
import { GROUPS, getComponentCatalogue } from "../status-config";
import { encodeUptime } from "./uptime-codec";
import type {
  CompactUptime,
  ComponentGroup,
  ComponentStatus,
  Incident,
  IncidentRef,
  Maintenance,
  Paginated,
  StatusSummary,
  UptimeMap,
} from "../types";
import { serverEnv } from "./env";
import { createGolviaStatusApi } from "./golvia-status-api";
import { memo } from "./memo";
import { createMockStatusApi } from "./mock-status-api";
import { getProbeRunner } from "./probes";
import type { ProbedComponent } from "./probes/run-probes";
import type { IncidentQuery, StatusRepository } from "./repository";
import { effectiveStatus, worstStatus } from "./status-precedence";

let repo: StatusRepository | undefined;
export function getRepository(): StatusRepository {
  repo ??= serverEnv.useMock ? createMockStatusApi() : createGolviaStatusApi();
  return repo;
}

const logError = (label: string, err: unknown) =>
  console.error(JSON.stringify({ msg: "backend_error", label, error: (err as Error)?.message ?? String(err) }));

/** Treat a "scheduled" window whose time has come as in progress, and drop finished ones. */
export function normaliseMaintenances(list: Maintenance[], now = Date.now()): Maintenance[] {
  return list
    .map((m) => {
      const start = Date.parse(m.scheduledStart);
      const end = Date.parse(m.scheduledEnd);
      if (m.status === "scheduled" && now >= start && now < end) return { ...m, status: "in_progress" as const };
      if (m.status !== "completed" && now >= end) return { ...m, status: "completed" as const };
      return m;
    })
    .filter((m) => m.status !== "completed")
    .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart));
}

/** Mock-only: force probe outcomes so every banner state can be reviewed. */
function applyScenario(results: Record<string, ProbedComponent>): Record<string, ProbedComponent> {
  const scenario = serverEnv.useMock ? serverEnv.mockScenario : undefined;
  if (!scenario) return results;
  const force: Record<string, Partial<Record<string, ComponentStatus>>> = {
    operational: {},
    degraded: { "core-api": "degraded" },
    partial: { "core-api": "degraded", feed: "partial_outage" },
    major: { "core-api": "major_outage", "web-app": "partial_outage" },
    maintenance: { wallet: "maintenance", gifting: "maintenance" },
  };
  const overrides = force[scenario] ?? {};
  const out = { ...results };
  for (const [id, status] of Object.entries(overrides)) {
    if (status) out[id] = { ...(out[id] ?? { id, automated: true, checkedAt: new Date().toISOString() }), status };
  }
  return out;
}

export interface BuildSummaryInput {
  probes: Record<string, ProbedComponent>;
  checkedAt: string;
  activeIncidents: Incident[];
  maintenances: Maintenance[];
  incidentsAvailable: boolean;
}

/** Pure: turn probe results + incidents into the public summary. */
export function buildSummary({
  probes,
  checkedAt,
  activeIncidents,
  maintenances,
  incidentsAvailable,
}: BuildSummaryInput): StatusSummary {
  const catalogue = getComponentCatalogue();
  const groups: ComponentGroup[] = GROUPS.map((g) => {
    const components = catalogue
      .filter((c) => c.groupId === g.id)
      .map((c) => {
        const p = probes[c.id];
        const probed: ComponentStatus = p?.status ?? "unknown";
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          groupId: c.groupId,
          automated: p?.automated ?? false,
          status: effectiveStatus(c.id, probed, activeIncidents, maintenances),
          latencyMs: p?.latencyMs,
          checkedAt: p?.checkedAt ?? checkedAt,
        };
      });
    return { id: g.id, name: g.name, components, status: worstStatus(components.map((c) => c.status)) };
  }).filter((g) => g.components.length > 0);

  return {
    overall: worstStatus(groups.map((g) => g.status)),
    groups,
    activeIncidents,
    upcomingMaintenance: maintenances,
    incidentsAvailable,
    updatedAt: checkedAt,
  };
}

/**
 * Public status summary. Probes and backend reads are each cached, and the
 * backend being down never prevents probe results from rendering.
 */
export async function getStatusSummary(): Promise<StatusSummary> {
  const ttl = serverEnv.probeCacheSeconds * 1000;
  const repository = getRepository();
  const [probeRun, incidentsRes, maintRes] = await Promise.all([
    getProbeRunner().get(),
    memo("incidents.active", ttl, () => repository.getActiveIncidents()).then(
      (v) => ({ ok: true as const, v }),
      (e) => (logError("incidents.active", e), { ok: false as const, v: [] as Incident[] }),
    ),
    memo("maintenances", ttl, () => repository.getMaintenances()).then(
      (v) => ({ ok: true as const, v }),
      (e) => (logError("maintenances", e), { ok: false as const, v: [] as Maintenance[] }),
    ),
  ]);

  return buildSummary({
    probes: applyScenario(probeRun.results),
    checkedAt: probeRun.checkedAt,
    activeIncidents: incidentsRes.v.filter((i) => i.phase !== "resolved"),
    maintenances: normaliseMaintenances(maintRes.v),
    incidentsAvailable: incidentsRes.ok && maintRes.ok,
  });
}

export async function getUptime(days = 90): Promise<UptimeMap | null> {
  try {
    return await memo(`uptime.${days}`, 5 * 60_000, () => getRepository().getUptime(days));
  } catch (e) {
    logError("uptime", e);
    return null;
  }
}

export async function listIncidents(query: IncidentQuery): Promise<Paginated<Incident> | null> {
  const key = `incidents.list.${query.from ?? ""}.${query.to ?? ""}.${query.page ?? 0}.${query.size ?? 20}`;
  try {
    return await memo(key, 60_000, () => getRepository().listIncidents(query));
  } catch (e) {
    logError("incidents.list", e);
    return null;
  }
}

/** Returns `undefined` when the backend is unreachable (distinct from "not found" = null). */
export async function getIncident(id: string): Promise<Incident | null | undefined> {
  try {
    return await memo(`incident.${id}`, 60_000, () => getRepository().getIncident(id));
  } catch (e) {
    logError("incident", e);
    return undefined;
  }
}

/**
 * Incidents for each of the last `days` UTC days, newest day first. Every day
 * is present, so empty days can say "No incidents reported". null = backend down.
 */
export async function getRecentIncidentsByDay(days = 14): Promise<[string, Incident[]][] | null> {
  const DAY = 86_400_000;
  const now = Date.now();
  const from = new Date(now - (days - 1) * DAY);
  from.setUTCHours(0, 0, 0, 0);
  const result = await listIncidents({ from: from.toISOString(), size: 100 });
  if (!result) return null;
  const byDay = new Map<string, Incident[]>();
  for (let i = 0; i < days; i++) byDay.set(new Date(now - i * DAY).toISOString().slice(0, 10), []);
  for (const inc of result.items) byDay.get(inc.startedAt.slice(0, 10))?.push(inc);
  return [...byDay.entries()];
}

/** Uptime history plus titles for every incident referenced by it (for bar tooltips). */
export async function getUptimePayload(days = 90): Promise<{ uptime: CompactUptime | null; incidents: Record<string, IncidentRef> }> {
  const now = Date.now();
  const from = new Date(now - days * 86_400_000).toISOString();
  const [uptime, list] = await Promise.all([getUptime(days), listIncidents({ from, size: 200 })]);
  const incidents: Record<string, IncidentRef> = {};
  for (const i of list?.items ?? []) incidents[i.id] = { id: i.id, title: i.title, severity: i.severity };
  return { uptime: uptime ? encodeUptime(uptime, days, new Date(now).toISOString().slice(0, 10)) : null, incidents };
}

/** Component id → display name, for labelling incidents. Safe to send to clients. */
export function getComponentNames(): Record<string, string> {
  return Object.fromEntries(getComponentCatalogue().map((c) => [c.id, c.name]));
}
