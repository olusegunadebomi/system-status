import { describe, expect, it } from "vitest";
import type { Incident, Maintenance } from "../types";
import { effectiveStatus, worstStatus } from "./status-precedence";

const incident = (over: Partial<Incident>): Incident => ({
  id: "i1",
  title: "t",
  severity: "minor",
  phase: "investigating",
  componentIds: ["feed"],
  startedAt: "2026-11-25T00:00:00Z",
  updates: [],
  ...over,
});

const maintenance = (over: Partial<Maintenance>): Maintenance => ({
  id: "m1",
  title: "t",
  body: "",
  componentIds: ["wallet"],
  scheduledStart: "2026-11-25T00:00:00Z",
  scheduledEnd: "2026-11-25T02:00:00Z",
  status: "in_progress",
  ...over,
});

describe("worstStatus", () => {
  it("returns the worst status (major > partial > degraded > maintenance > operational > unknown)", () => {
    expect(worstStatus(["operational", "degraded", "maintenance"])).toBe("degraded");
    expect(worstStatus(["partial_outage", "major_outage", "operational"])).toBe("major_outage");
    expect(worstStatus(["operational", "maintenance"])).toBe("maintenance");
    expect(worstStatus(["unknown", "operational"])).toBe("operational");
  });

  it("is unknown for an empty list", () => {
    expect(worstStatus([])).toBe("unknown");
  });
});

describe("effectiveStatus", () => {
  it("raises an operational probe to the incident severity", () => {
    expect(effectiveStatus("feed", "operational", [incident({ severity: "major" })], [])).toBe("partial_outage");
    expect(effectiveStatus("feed", "operational", [incident({ severity: "critical" })], [])).toBe("major_outage");
  });

  it("never lets a minor incident hide a worse probe result", () => {
    expect(effectiveStatus("feed", "major_outage", [incident({ severity: "minor" })], [])).toBe("major_outage");
  });

  it("ignores resolved incidents and other components", () => {
    expect(effectiveStatus("feed", "operational", [incident({ phase: "resolved", severity: "critical" })], [])).toBe("operational");
    expect(effectiveStatus("wallet", "operational", [incident({ severity: "critical" })], [])).toBe("operational");
  });

  it("marks in-progress maintenance but not scheduled windows", () => {
    expect(effectiveStatus("wallet", "operational", [], [maintenance({})])).toBe("maintenance");
    expect(effectiveStatus("wallet", "operational", [], [maintenance({ status: "scheduled" })])).toBe("operational");
  });
});
