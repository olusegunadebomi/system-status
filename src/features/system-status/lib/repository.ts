import type {
  Incident,
  Maintenance,
  Paginated,
  UptimeMap,
} from "../types";

export interface IncidentQuery {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

/**
 * Source of incidents, maintenance, and uptime history.
 * Implementations: the Golvia backend (`golvia-status-api.ts`) and the
 * sample-data adapter (`mock-status-api.ts`). Add a CMS/DB adapter here later.
 */
export interface StatusRepository {
  getActiveIncidents(): Promise<Incident[]>;
  listIncidents(query: IncidentQuery): Promise<Paginated<Incident>>;
  getIncident(id: string): Promise<Incident | null>;
  getMaintenances(): Promise<Maintenance[]>;
  getUptime(days: number): Promise<UptimeMap>;
  subscribe(email: string): Promise<void>;
}
