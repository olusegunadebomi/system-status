import type { AxiosInstance } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGolviaStatusApi } from "./golvia-status-api";

function fakeClient(get: (url: string) => unknown): AxiosInstance {
  return {
    get: vi.fn(async (url: string) => ({ data: await get(url) })),
    post: vi.fn(async () => ({ data: {} })),
  } as unknown as AxiosInstance;
}

const validIncident = {
  id: "inc-1",
  title: "Feed errors",
  severity: "major",
  phase: "identified",
  componentIds: ["feed"],
  startedAt: "2026-11-25T10:00:00Z",
  updates: [
    { id: "u1", phase: "investigating", body: "Looking", createdAt: "2026-11-25T10:00:00Z" },
    { id: "u2", phase: "identified", body: "Found it", createdAt: "2026-11-25T10:30:00Z" },
    { id: "bad", phase: "nope", body: 1, createdAt: "x" },
  ],
};

describe("golvia status api", () => {
  afterEach(() => vi.restoreAllMocks());

  it("drops malformed incidents and updates instead of throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = createGolviaStatusApi(
      fakeClient(() => ({ data: [validIncident, { id: "broken" }, null, "junk"] })),
    );
    const incidents = await api.getActiveIncidents();
    expect(incidents).toHaveLength(1);
    expect(incidents[0].updates.map((u) => u.id)).toEqual(["u2", "u1"]); // newest first, bad one dropped
    expect(warn).toHaveBeenCalled();
  });

  it("returns an empty list when the payload is not an array", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = createGolviaStatusApi(fakeClient(() => ({ unexpected: true })));
    expect(await api.getMaintenances()).toEqual([]);
  });

  it("reads Spring-style pages for incident history", async () => {
    const api = createGolviaStatusApi(fakeClient(() => ({ content: [validIncident], totalElements: 41 })));
    const page = await api.listIncidents({ page: 2, size: 20 });
    expect(page).toMatchObject({ page: 2, size: 20, total: 41 });
    expect(page.items).toHaveLength(1);
  });

  it("filters invalid uptime days per component", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = createGolviaStatusApi(
      fakeClient(() => ({
        feed: [
          { date: "2026-11-24", uptimePct: 99.9, worstStatus: "degraded", incidentIds: [] },
          { date: "yesterday", uptimePct: "high" },
        ],
      })),
    );
    const uptime = await api.getUptime(90);
    expect(uptime.feed).toHaveLength(1);
  });

  it("propagates network failures so callers can fall back", async () => {
    const api = createGolviaStatusApi(
      fakeClient(() => {
        throw new Error("ECONNREFUSED");
      }),
    );
    await expect(api.getActiveIncidents()).rejects.toThrow("ECONNREFUSED");
  });
});

describe("summary fallback", () => {
  it("still renders probe results when the backend is down", async () => {
    const { buildSummary } = await import("./status-service");
    const summary = buildSummary({
      probes: {
        "web-app": { id: "web-app", automated: true, status: "major_outage", checkedAt: "2026-11-25T10:00:00Z" },
      },
      checkedAt: "2026-11-25T10:00:00Z",
      activeIncidents: [],
      maintenances: [],
      incidentsAvailable: false,
    });
    expect(summary.incidentsAvailable).toBe(false);
    expect(summary.overall).toBe("major_outage");
    expect(summary.groups.find((g) => g.id === "core")?.status).toBe("major_outage");
    // Public payload must not leak probe targets.
    expect(JSON.stringify(summary)).not.toMatch(/https?:\/\//);
  });
});
