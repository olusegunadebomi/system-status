import { describe, expect, it, vi } from "vitest";
import type { ComponentConfig } from "../../status-config";
import { createProbeRunner, INITIAL_FLAP_STATE, nextFlapState, type FlapState, type RunOutcome } from "./run-probes";
import type { ProbeOutcome } from "./types";

function sequence(outcomes: RunOutcome[]) {
  let state: FlapState = INITIAL_FLAP_STATE;
  return outcomes.map((o) => {
    const next = nextFlapState(state, o);
    state = next.state;
    return next.status;
  });
}

describe("anti-flap state machine", () => {
  it("degrades on the first failure and goes down on the second", () => {
    expect(sequence(["ok", "fail", "fail"])).toEqual(["operational", "degraded", "major_outage"]);
  });

  it("reports a partial outage when only some checks fail twice", () => {
    expect(sequence(["partial", "partial"])).toEqual(["degraded", "partial_outage"]);
  });

  it("needs two consecutive successes to recover", () => {
    expect(sequence(["fail", "fail", "ok", "ok", "ok"])).toEqual([
      "degraded",
      "major_outage",
      "degraded",
      "operational",
      "operational",
    ]);
  });

  it("does not recover if a failure interrupts the successes", () => {
    expect(sequence(["fail", "fail", "ok", "fail", "ok", "ok"])).toEqual([
      "degraded",
      "major_outage",
      "degraded",
      "degraded",
      "degraded",
      "operational",
    ]);
  });

  it("marks slow successes as degraded", () => {
    expect(sequence(["slow", "ok"])).toEqual(["degraded", "operational"]);
  });
});

describe("probe runner cache", () => {
  const catalogue: ComponentConfig[] = [
    { id: "web", name: "Web", groupId: "core", probe: [{ kind: "http", url: "https://example.test" }] },
    { id: "manual", name: "Manual", groupId: "core", probe: null },
  ];

  function setup(outcome: ProbeOutcome = { ok: true, latencyMs: 50 }) {
    let now = 1_000_000;
    const probe = vi.fn(async () => outcome);
    const runner = createProbeRunner({
      catalogue: () => catalogue,
      probe,
      options: { timeoutMs: 5000, degradedMs: 2000, cacheMs: 30_000, errorCacheMs: 5000, concurrency: 6 },
      now: () => now,
    });
    return { runner, probe, advance: (ms: number) => (now += ms) };
  }

  it("coalesces concurrent calls into a single probe run", async () => {
    const { runner, probe } = setup();
    await Promise.all(Array.from({ length: 100 }, () => runner.get()));
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("serves from cache until the TTL expires", async () => {
    const { runner, probe, advance } = setup();
    await runner.get();
    advance(29_000);
    await runner.get();
    expect(probe).toHaveBeenCalledTimes(1);
    advance(2_000);
    await runner.get();
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("uses the short error TTL after a failure", async () => {
    const { runner, probe, advance } = setup({ ok: false, latencyMs: 5000, reason: "timeout" });
    await runner.get();
    advance(6_000);
    await runner.get();
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("marks components without probes as manual and operational", async () => {
    const { runner } = setup();
    const run = await runner.get();
    expect(run.results.manual).toMatchObject({ automated: false, status: "operational" });
    expect(run.results.web).toMatchObject({ automated: true, status: "operational", latencyMs: 50 });
  });

  it("degrades components that respond slowly", async () => {
    const { runner } = setup({ ok: true, latencyMs: 2500 });
    const run = await runner.get();
    expect(run.results.web.status).toBe("degraded");
  });
});
