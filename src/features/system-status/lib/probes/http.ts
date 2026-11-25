import type { ProbeOptions, ProbeOutcome } from "./types";

const USER_AGENT = "GolviaStatusProbe/1.0 (+https://status.golvia.app)";

export interface HttpProbeInput {
  url: string;
  method?: "GET" | "HEAD";
  /** success = 2xx/3xx; reachable = anything below 500 (route is serving) */
  accept?: "success" | "reachable";
}

export async function httpProbe(
  { url, method = "GET", accept = "success" }: HttpProbeInput,
  { timeoutMs }: ProbeOptions,
): Promise<ProbeOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
    });
    // Drain the body so the socket is released; we never need the content.
    await res.body?.cancel().catch(() => {});
    const latencyMs = Math.round(performance.now() - started);
    const ok = accept === "reachable" ? res.status < 500 : res.status >= 200 && res.status < 400;
    return { ok, latencyMs, reason: ok ? undefined : `http_${res.status}` };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - started);
    const reason = controller.signal.aborted ? "timeout" : `network_${(err as Error)?.name ?? "error"}`;
    return { ok: false, latencyMs, reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch a JSON health payload (Spring Actuator style). Returns null on any failure. */
export async function fetchHealthPayload(
  url: string,
  { timeoutMs }: ProbeOptions,
): Promise<{ outcome: ProbeOutcome; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    // Actuator returns 503 with a body when DOWN, so parse regardless of status.
    const body = await res.json().catch(() => null);
    const latencyMs = Math.round(performance.now() - started);
    return {
      outcome: { ok: res.ok, latencyMs, reason: res.ok ? undefined : `http_${res.status}` },
      body,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - started);
    const reason = controller.signal.aborted ? "timeout" : `network_${(err as Error)?.name ?? "error"}`;
    return { outcome: { ok: false, latencyMs, reason }, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Read `components.<name>.status === "UP"` from an Actuator-style payload. */
export function healthComponentUp(body: unknown, component: string): boolean | undefined {
  if (!body || typeof body !== "object") return undefined;
  const components = (body as { components?: Record<string, { status?: unknown }> }).components;
  const status = components?.[component]?.status;
  if (typeof status !== "string") return undefined;
  return status.toUpperCase() === "UP";
}
