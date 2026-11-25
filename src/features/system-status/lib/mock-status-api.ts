import "server-only";
import type {
  ComponentStatus,
  DailyUptime,
  Incident,
  IncidentPhase,
  Maintenance,
  Severity,
  UptimeMap,
} from "../types";
import { getComponentCatalogue } from "../status-config";
import type { StatusRepository } from "./repository";
import { severityToStatus, worstStatus } from "./status-precedence";

/**
 * Sample incidents, maintenance and uptime for development and previews. Only used when NODE_ENV is not
 * "production", or when STATUS_MOCK=1 is set explicitly. Data is generated
 * relative to the current time with a seeded RNG, so it looks live but stays
 * stable between reloads.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7);
const iso = (ms: number) => new Date(ms).toISOString();
const dayKey = (ms: number) => iso(ms).slice(0, 10);

interface Seed {
  id: string;
  title: string;
  severity: Severity;
  componentIds: string[];
  /** start, relative to now */
  ago: number;
  /** duration; undefined = still active */
  duration?: number;
  updates: [IncidentPhase, number /* offset from start */, string][];
}

const SEEDS: Seed[] = [
  {
    id: "inc-msg-delay",
    title: "Delayed message delivery",
    severity: "minor",
    componentIds: ["messaging", "presence"],
    ago: 50 * MIN,
    updates: [
      ["investigating", 0, "Some users are seeing messages arrive late. We're looking into it."],
      ["identified", 30 * MIN, "One of the real-time message brokers is overloaded. We're adding capacity now. Messages are queued, not lost."],
    ],
  },
  {
    id: "inc-feed-errors",
    title: "Elevated error rates on the feed",
    severity: "major",
    componentIds: ["feed", "core-api"],
    ago: 1 * DAY + 4 * HOUR,
    duration: 2 * HOUR + 40 * MIN,
    updates: [
      ["investigating", 0, "Some users can't load their feed or see errors when posting."],
      ["identified", 35 * MIN, "A slow database query after this morning's release is causing timeouts. We're rolling it back."],
      ["monitoring", 1 * HOUR + 50 * MIN, "The rollback is done and error rates are back to normal. We're keeping an eye on it."],
      ["resolved", 2 * HOUR + 40 * MIN, "This incident is resolved. Feeds and posting are working normally."],
    ],
  },
  {
    id: "inc-live-start",
    title: "Live streams failing to start for some users",
    severity: "major",
    componentIds: ["live"],
    ago: 3 * DAY + 9 * HOUR,
    duration: 1 * HOUR + 15 * MIN,
    updates: [
      ["investigating", 0, "Some creators see an error when they tap Go Live."],
      ["identified", 25 * MIN, "Stream tokens were not being issued for one region. We've applied a fix."],
      ["resolved", 75 * MIN, "Go Live is working again for everyone."],
    ],
  },
  {
    id: "inc-google-signin",
    title: "Google Sign-In unavailable",
    severity: "critical",
    componentIds: ["auth"],
    ago: 6 * DAY + 2 * HOUR,
    duration: 42 * MIN,
    updates: [
      ["investigating", 0, "Signing in with Google fails. Email sign-in still works."],
      ["monitoring", 30 * MIN, "We've rotated an expired OAuth credential. Google Sign-In is recovering."],
      ["resolved", 42 * MIN, "Google Sign-In is fully restored."],
    ],
  },
  {
    id: "inc-upload-slow",
    title: "Slow media uploads",
    severity: "minor",
    componentIds: ["media-storage"],
    ago: 11 * DAY + 5 * HOUR,
    duration: 3 * HOUR,
    updates: [
      ["investigating", 0, "Photo and video uploads are slower than usual."],
      ["resolved", 3 * HOUR, "Upload speeds are back to normal."],
    ],
  },
  {
    id: "inc-wallet-topup",
    title: "Wallet top-ups delayed",
    severity: "major",
    componentIds: ["wallet", "gifting"],
    ago: 25 * DAY,
    duration: 90 * MIN,
    updates: [
      ["investigating", 0, "GoCoin top-ups are taking longer than usual to appear in wallets."],
      ["identified", 40 * MIN, "Our payment provider delayed its confirmations. We're reprocessing the affected top-ups."],
      ["resolved", 90 * MIN, "All delayed top-ups have been credited."],
    ],
  },
  {
    id: "inc-search",
    title: "Search returning incomplete results",
    severity: "minor",
    componentIds: ["explore"],
    ago: 40 * DAY,
    duration: 5 * HOUR,
    updates: [
      ["investigating", 0, "Some new profiles and posts are missing from search results."],
      ["resolved", 5 * HOUR, "The search index is rebuilt and results are complete."],
    ],
  },
  {
    id: "inc-checkout",
    title: "Marketplace checkout errors",
    severity: "critical",
    componentIds: ["marketplace"],
    ago: 58 * DAY,
    duration: 55 * MIN,
    updates: [
      ["investigating", 0, "Checkout fails with an error for all users."],
      ["resolved", 55 * MIN, "Checkout is working again. No duplicate charges were made."],
    ],
  },
  {
    id: "inc-push",
    title: "Push notifications delayed",
    severity: "minor",
    componentIds: ["notifications"],
    ago: 75 * DAY,
    duration: 2 * HOUR,
    updates: [
      ["investigating", 0, "Push notifications are arriving late."],
      ["resolved", 2 * HOUR, "Notifications are being delivered on time again."],
    ],
  },
  {
    id: "inc-kyc",
    title: "Verification documents stuck in review",
    severity: "minor",
    componentIds: ["kyc"],
    ago: 104 * DAY,
    duration: 9 * HOUR,
    updates: [
      ["investigating", 0, "ID verification submissions are not progressing."],
      ["resolved", 9 * HOUR, "All pending verifications have been processed."],
    ],
  },
];

function buildIncident(seed: Seed, now: number): Incident {
  const start = now - seed.ago;
  const updates = seed.updates
    .map(([phase, offset, body], i) => ({ id: `${seed.id}-u${i}`, phase, body, createdAt: iso(start + offset) }))
    .reverse();
  return {
    id: seed.id,
    title: seed.title,
    severity: seed.severity,
    phase: updates[0].phase,
    componentIds: seed.componentIds,
    startedAt: iso(start),
    resolvedAt: seed.duration !== undefined ? iso(start + seed.duration) : undefined,
    updates,
  };
}

function allIncidents(now: number): Incident[] {
  return SEEDS.map((s) => buildIncident(s, now)).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

function maintenances(now: number): Maintenance[] {
  // Anchor to 01:00 UTC a few days out, the quietest hour for Golvia traffic.
  const at = (days: number, hourUtc: number) => {
    const d = new Date(now + days * DAY);
    d.setUTCHours(hourUtc, 0, 0, 0);
    return d.getTime();
  };
  return [
    {
      id: "mnt-wallet-db",
      title: "Wallet database upgrade",
      body: "We're upgrading the wallet database. GoCoin top-ups and gifting may be unavailable for up to 30 minutes during this window. Balances are not affected.",
      componentIds: ["wallet", "gifting"],
      scheduledStart: iso(at(3, 1)),
      scheduledEnd: iso(at(3, 3)),
      status: "scheduled",
    },
    {
      id: "mnt-realtime",
      title: "Real-time infrastructure upgrade",
      body: "Messaging and calls may reconnect briefly while we move to new servers.",
      componentIds: ["messaging", "calls", "presence"],
      scheduledStart: iso(at(9, 2)),
      scheduledEnd: iso(at(9, 4)),
      status: "scheduled",
    },
  ];
}

function uptime(days: number, now: number): UptimeMap {
  const incidents = allIncidents(now);
  const out: UptimeMap = {};
  for (const { id } of getComponentCatalogue()) {
    const rand = mulberry32(hash(id));
    const series: DailyUptime[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = Date.parse(`${dayKey(now - i * DAY)}T00:00:00.000Z`);
      const dayEnd = Math.min(dayStart + DAY, now);
      let downMs = 0;
      const statuses: ComponentStatus[] = ["operational"];
      const ids: string[] = [];
      for (const inc of incidents) {
        if (!inc.componentIds.includes(id)) continue;
        const s = Date.parse(inc.startedAt);
        const e = inc.resolvedAt ? Date.parse(inc.resolvedAt) : now;
        const overlap = Math.min(e, dayEnd) - Math.max(s, dayStart);
        if (overlap <= 0) continue;
        ids.push(inc.id);
        statuses.push(severityToStatus(inc.severity));
        // Minor incidents degrade rather than take the service down: count a fraction.
        const weight = inc.severity === "critical" ? 1 : inc.severity === "major" ? 0.6 : 0.25;
        downMs += overlap * weight;
      }
      // Occasional short blip on otherwise clean days.
      const r = rand();
      if (ids.length === 0 && r > 0.965) {
        downMs += (2 + Math.floor(rand() * 8)) * MIN;
        statuses.push("degraded");
      }
      const span = Math.max(dayEnd - dayStart, 1);
      const pct = Math.max(0, 100 - (downMs / span) * 100);
      series.push({
        date: dayKey(dayStart),
        uptimePct: Math.round(pct * 100) / 100,
        worstStatus: worstStatus(statuses),
        incidentIds: ids,
      });
    }
    out[id] = series;
  }
  return out;
}

export function createMockStatusApi(now: () => number = Date.now): StatusRepository {
  const repo: StatusRepository = {
    async getActiveIncidents() {
      return allIncidents(now()).filter((i) => i.phase !== "resolved");
    },
    async listIncidents({ from, to, page = 0, size = 20 }) {
      const f = from ? Date.parse(from) : -Infinity;
      const t = to ? Date.parse(to) : Infinity;
      const matching = allIncidents(now()).filter((i) => {
        const s = Date.parse(i.startedAt);
        return s >= f && s < t;
      });
      return { items: matching.slice(page * size, page * size + size), page, size, total: matching.length };
    },
    async getIncident(id) {
      return allIncidents(now()).find((i) => i.id === id) ?? null;
    },
    async getMaintenances() {
      return maintenances(now());
    },
    async getUptime(days) {
      return uptime(days, now());
    },
    async subscribe(email) {
      console.log(JSON.stringify({ msg: "mock_subscribe", domain: email.split("@")[1] }));
    },
  };
  return repo;
}
