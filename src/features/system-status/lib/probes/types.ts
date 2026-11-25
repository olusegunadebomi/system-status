export interface ProbeOutcome {
  ok: boolean;
  latencyMs: number;
  /** Short machine-readable reason, logged only; never sent to clients. */
  reason?: string;
}

export interface ProbeOptions {
  timeoutMs: number;
}
