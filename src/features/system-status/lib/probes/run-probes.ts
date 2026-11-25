import type { ComponentConfig, ProbeSpec } from "../../status-config";
import type { ComponentStatus } from "../../types";
import { fetchHealthPayload, healthComponentUp, httpProbe } from "./http";
import { sockjsProbe } from "./sockjs";
import type { ProbeOptions, ProbeOutcome } from "./types";

export interface ProbedComponent {
  id: string;
  /** false when the component has no automated check (status comes from incidents only) */
  automated: boolean;
  status: ComponentStatus;
  latencyMs?: number;
  checkedAt: string;
}

export interface ProbeRun {
  results: Record<string, ProbedComponent>;
  checkedAt: string;
}

/** Aggregated outcome of all specs for one component in one run. */
export type RunOutcome = "ok" | "slow" | "partial" | "fail";

// ── Anti-flap state machine ──────────────────────────────────────────────────

export interface FlapState {
  failures: number;
  successes: number;
  /** true while a failure has not yet been cleared by 2 consecutive successes */
  failing: boolean;
}

export const INITIAL_FLAP_STATE: FlapState = { failures: 0, successes: 0, failing: false };

/**
 * 1 failure → degraded. 2 consecutive failures → outage (partial if only some
 * checks failed). 2 consecutive successes are needed to recover; the first
 * success after a failure keeps the component at "degraded".
 */
export function nextFlapState(
  prev: FlapState,
  outcome: RunOutcome,
): { state: FlapState; status: ComponentStatus } {
  if (outcome === "fail" || outcome === "partial") {
    const failures = prev.failures + 1;
    const status: ComponentStatus =
      failures >= 2 ? (outcome === "partial" ? "partial_outage" : "major_outage") : "degraded";
    return { state: { failures, successes: 0, failing: true }, status };
  }
  const successes = prev.successes + 1;
  if (prev.failing && successes < 2) {
    return { state: { failures: 0, successes, failing: true }, status: "degraded" };
  }
  return {
    state: { failures: 0, successes, failing: false },
    status: outcome === "slow" ? "degraded" : "operational",
  };
}

// ── Concurrency helper ───────────────────────────────────────────────────────

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Runner with cache + in-flight coalescing ─────────────────────────────────

export type SpecProber = (spec: ProbeSpec, ctx: { health: () => Promise<{ outcome: ProbeOutcome; body: unknown }> | null }) => Promise<ProbeOutcome | null>;

export interface ProbeRunnerOptions {
  catalogue: () => ComponentConfig[];
  probe: SpecProber;
  healthUrl?: string;
  options: ProbeOptions & { degradedMs: number; cacheMs: number; errorCacheMs: number; concurrency: number };
  now?: () => number;
  log?: (line: Record<string, unknown>) => void;
}

export function createProbeRunner(cfg: ProbeRunnerOptions) {
  const now = cfg.now ?? Date.now;
  const flap = new Map<string, FlapState>();
  let cached: { run: ProbeRun; expiresAt: number } | null = null;
  let inflight: Promise<ProbeRun> | null = null;

  async function runOnce(): Promise<ProbeRun> {
    const catalogue = cfg.catalogue();
    let healthPromise: Promise<{ outcome: ProbeOutcome; body: unknown }> | null = null;
    const health = () => {
      if (!cfg.healthUrl) return null;
      healthPromise ??= fetchHealthPayload(cfg.healthUrl, cfg.options);
      return healthPromise;
    };

    let anyFailure = false;
    const checkedAt = new Date(now()).toISOString();
    const entries = await mapLimit(catalogue, cfg.options.concurrency, async (component) => {
      const specs = component.probe ?? [];
      const settled = await Promise.allSettled(specs.map((s) => cfg.probe(s, { health })));
      const outcomes = settled
        .map((r) => (r.status === "fulfilled" ? r.value : { ok: false, latencyMs: 0, reason: "probe_threw" }))
        .filter((o): o is ProbeOutcome => o !== null);

      if (outcomes.length === 0) {
        return [component.id, { id: component.id, automated: false, status: "operational", checkedAt }] as const;
      }

      const failed = outcomes.filter((o) => !o.ok).length;
      const latencyMs = Math.max(...outcomes.map((o) => o.latencyMs));
      const outcome: RunOutcome =
        failed === outcomes.length ? "fail" : failed > 0 ? "partial" : latencyMs > cfg.options.degradedMs ? "slow" : "ok";
      if (failed > 0) anyFailure = true;

      const { state, status } = nextFlapState(flap.get(component.id) ?? INITIAL_FLAP_STATE, outcome);
      flap.set(component.id, state);

      cfg.log?.({
        msg: "probe",
        component: component.id,
        ok: failed === 0,
        outcome,
        status,
        latencyMs,
        reasons: outcomes.map((o) => o.reason).filter(Boolean),
      });

      return [component.id, { id: component.id, automated: true, status, latencyMs, checkedAt }] as const;
    });

    const run: ProbeRun = { results: Object.fromEntries(entries), checkedAt };
    cached = { run, expiresAt: now() + (anyFailure ? cfg.options.errorCacheMs : cfg.options.cacheMs) };
    return run;
  }

  return {
    /** Cached probe results. Concurrent callers share one in-flight run. */
    async get(): Promise<ProbeRun> {
      if (cached && now() < cached.expiresAt) return cached.run;
      if (inflight) return inflight;
      inflight = runOnce().finally(() => {
        inflight = null;
      });
      return inflight;
    },
    /** For tests. */
    reset() {
      cached = null;
      inflight = null;
      flap.clear();
    },
  };
}

// ── Default spec prober ──────────────────────────────────────────────────────

export function defaultSpecProber(opts: ProbeOptions): SpecProber {
  return async (spec, { health }) => {
    switch (spec.kind) {
      case "http":
        return spec.url ? httpProbe({ url: spec.url, method: spec.method, accept: spec.accept }, opts) : null;
      case "s3":
        return spec.url ? httpProbe({ url: spec.url, method: "HEAD" }, opts) : null;
      case "sockjs":
        return spec.url ? sockjsProbe(spec.url, opts) : null;
      case "health": {
        const h = health();
        if (!h) return null;
        const { outcome, body } = await h;
        const up = healthComponentUp(body, spec.component);
        if (up === undefined) return outcome.ok ? null : outcome; // component not reported
        return { ok: up, latencyMs: outcome.latencyMs, reason: up ? undefined : `health_${spec.component}_down` };
      }
    }
  };
}
