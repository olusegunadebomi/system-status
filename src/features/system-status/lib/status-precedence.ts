import type { ComponentStatus, Incident, Maintenance, Severity } from "../types";

/** Higher = worse. `unknown` ranks lowest so it never masks a real signal. */
const RANK: Record<ComponentStatus, number> = {
  unknown: 0,
  operational: 1,
  maintenance: 2,
  degraded: 3,
  partial_outage: 4,
  major_outage: 5,
};

export function statusRank(status: ComponentStatus): number {
  return RANK[status];
}

export function worstStatus(statuses: Iterable<ComponentStatus>): ComponentStatus {
  let worst: ComponentStatus = "unknown";
  for (const s of statuses) if (RANK[s] > RANK[worst]) worst = s;
  return worst;
}

export function severityToStatus(severity: Severity): ComponentStatus {
  switch (severity) {
    case "minor":
      return "degraded";
    case "major":
      return "partial_outage";
    case "critical":
      return "major_outage";
    case "maintenance":
      return "maintenance";
  }
}

/**
 * Combine the probed status of a component with any active incidents and
 * in-progress maintenance affecting it. Worst signal wins, so a human-declared
 * incident can never hide a probe that is failing harder, and vice versa.
 */
export function effectiveStatus(
  componentId: string,
  probed: ComponentStatus,
  activeIncidents: Incident[],
  maintenances: Maintenance[],
): ComponentStatus {
  const signals: ComponentStatus[] = [probed];
  for (const inc of activeIncidents) {
    if (inc.phase !== "resolved" && inc.componentIds.includes(componentId)) {
      signals.push(severityToStatus(inc.severity));
    }
  }
  for (const m of maintenances) {
    if (m.status === "in_progress" && m.componentIds.includes(componentId)) {
      signals.push("maintenance");
    }
  }
  return worstStatus(signals);
}
