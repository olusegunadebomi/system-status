import "server-only";

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function url(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v.replace(/\/+$/, "") : undefined;
}

/**
 * Server-only configuration. Nothing in here may be sent to the browser:
 * probe targets and tokens are internal details.
 */
export const serverEnv = {
  apiBaseUrl: url(process.env.GOLVIA_API_BASE_URL),
  webUrl: url(process.env.GOLVIA_WEB_URL) ?? "https://golvia.app",
  wsUrl:
    url(process.env.GOLVIA_WS_URL) ??
    (url(process.env.GOLVIA_API_BASE_URL) ? `${url(process.env.GOLVIA_API_BASE_URL)}/ws` : undefined),
  s3ProbeUrl: url(process.env.GOLVIA_S3_PROBE_URL),
  /** Path of the backend health endpoint, e.g. "/actuator/health". TODO(backend): confirm. */
  healthPath: process.env.GOLVIA_HEALTH_PATH?.trim() || undefined,
  statusApiToken: process.env.GOLVIA_STATUS_API_TOKEN?.trim() || undefined,

  probeTimeoutMs: num(process.env.PROBE_TIMEOUT_MS, 5000),
  probeDegradedMs: num(process.env.PROBE_DEGRADED_MS, 2000),
  probeCacheSeconds: num(process.env.PROBE_CACHE_SECONDS, 30),

  /**
   * Mock backend adapter (sample incidents, maintenance and uptime). Always on
   * outside production; in production only when STATUS_MOCK=1 is set explicitly.
   */
  useMock: process.env.STATUS_MOCK === "1" || process.env.NODE_ENV !== "production",
  /** Optional: force every probe to a fixed outcome for UI testing (mock mode only). */
  mockScenario: process.env.STATUS_MOCK_SCENARIO?.trim() || undefined,
} as const;
