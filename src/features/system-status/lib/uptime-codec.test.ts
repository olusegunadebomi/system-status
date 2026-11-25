import { describe, expect, it } from "vitest";
import { decodeComponentUptime, encodeUptime } from "./uptime-codec";

describe("uptime codec", () => {
  it("round-trips data and fills missing days with null", () => {
    const map = {
      feed: [
        { date: "2026-11-23", uptimePct: 99.5, worstStatus: "degraded" as const, incidentIds: ["a", "b"] },
        { date: "2026-11-25", uptimePct: 100, worstStatus: "operational" as const, incidentIds: [] },
      ],
    };
    const compact = encodeUptime(map, 3, "2026-11-25");
    expect(decodeComponentUptime(compact, "feed")).toEqual([
      { date: "2026-11-23", uptimePct: 99.5, worstStatus: "degraded", incidentIds: ["a", "b"] },
      null,
      { date: "2026-11-25", uptimePct: 100, worstStatus: "operational", incidentIds: [] },
    ]);
    expect(decodeComponentUptime(compact, "missing")).toBeUndefined();
  });
});
