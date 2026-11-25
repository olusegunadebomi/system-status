import type { CompactUptime, ComponentStatus, DailyUptime, UptimeMap } from "../types";

const STATUSES: ComponentStatus[] = ["operational", "degraded", "partial_outage", "major_outage", "maintenance", "unknown"];
const DAY = 86_400_000;

const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Pack the last `days` days of each component into the compact wire format. */
export function encodeUptime(map: UptimeMap, days: number, end: string): CompactUptime {
  const endMs = Date.parse(`${end}T00:00:00Z`);
  const components: CompactUptime["components"] = {};
  for (const [id, series] of Object.entries(map)) {
    const byDate = new Map(series.map((d) => [d.date, d]));
    const out: (number | string)[][] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = byDate.get(toKey(endMs - i * DAY));
      out.push(d ? [d.uptimePct, STATUSES.indexOf(d.worstStatus), ...d.incidentIds] : []);
    }
    components[id] = out;
  }
  return { end, days, components };
}

/** Expand one component's series; days with no data come back as null. */
export function decodeComponentUptime(c: CompactUptime, id: string): (DailyUptime | null)[] | undefined {
  const series = c.components[id];
  if (!series) return undefined;
  const endMs = Date.parse(`${c.end}T00:00:00Z`);
  return series.map((entry, i) => {
    if (entry.length < 2) return null;
    const [pct, status, ...ids] = entry;
    return {
      date: toKey(endMs - (series.length - 1 - i) * DAY),
      uptimePct: Number(pct),
      worstStatus: STATUSES[Number(status)] ?? "unknown",
      incidentIds: ids.map(String),
    };
  });
}
