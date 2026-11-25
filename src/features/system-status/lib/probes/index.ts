import "server-only";
import { getComponentCatalogue } from "../../status-config";
import { serverEnv } from "../env";
import { createProbeRunner, defaultSpecProber } from "./run-probes";

type Runner = ReturnType<typeof createProbeRunner>;

// Keep one runner per process (survives dev HMR) so the cache and the
// anti-flap state are shared by every request.
const g = globalThis as typeof globalThis & { __golviaProbeRunner?: Runner };

export function getProbeRunner(): Runner {
  if (!g.__golviaProbeRunner) {
    const options = {
      timeoutMs: serverEnv.probeTimeoutMs,
      degradedMs: serverEnv.probeDegradedMs,
      cacheMs: serverEnv.probeCacheSeconds * 1000,
      errorCacheMs: 5000,
      concurrency: 6,
    };
    g.__golviaProbeRunner = createProbeRunner({
      catalogue: getComponentCatalogue,
      probe: defaultSpecProber(options),
      healthUrl:
        serverEnv.apiBaseUrl && serverEnv.healthPath ? `${serverEnv.apiBaseUrl}${serverEnv.healthPath}` : undefined,
      options,
      log: (line) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...line })),
    });
  }
  return g.__golviaProbeRunner;
}
