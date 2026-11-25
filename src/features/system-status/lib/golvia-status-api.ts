import "server-only";
import axios, { type AxiosInstance } from "axios";
import type { Incident, Paginated } from "../types";
import { serverEnv } from "./env";
import type { IncidentQuery, StatusRepository } from "./repository";
import {
  filterValid,
  isIncident,
  isMaintenance,
  normaliseIncident,
  parseUptimeMap,
  unwrap,
} from "./validators";

const BASE = "/api/v1/system-status";

/**
 * Server-only client for the Golvia backend's system-status endpoints.
 * Deliberately NOT golvia-frontend's axios instance: that one reads
 * localStorage and redirects to /login on 401.
 */
export function createGolviaStatusApi(client?: AxiosInstance): StatusRepository {
  const http =
    client ??
    axios.create({
      baseURL: serverEnv.apiBaseUrl,
      timeout: 5000,
      headers: {
        Accept: "application/json",
        ...(serverEnv.statusApiToken ? { Authorization: `Bearer ${serverEnv.statusApiToken}` } : {}),
      },
    });

  const get = async (path: string, params?: Record<string, unknown>) => {
    if (!client && !serverEnv.apiBaseUrl) throw new Error("GOLVIA_API_BASE_URL is not configured");
    const res = await http.get(`${BASE}${path}`, { params });
    return unwrap(res.data);
  };

  const incidents = (raw: unknown, label: string): Incident[] =>
    filterValid(raw, isIncident, label).map(normaliseIncident);

  const repo: StatusRepository = {
    async getActiveIncidents() {
      return incidents(await get("/incidents", { state: "active" }), "incidents.active");
    },

    async listIncidents({ from, to, page = 0, size = 20 }: IncidentQuery): Promise<Paginated<Incident>> {
      const body = await get("/incidents", { from, to, page, size });
      // Accept either a bare array or a Spring-style page { content, totalElements, number, size }.
      if (Array.isArray(body)) {
        const items = incidents(body, "incidents.list");
        return { items, page, size, total: items.length };
      }
      const b = (body ?? {}) as Record<string, unknown>;
      const items = incidents(b.content ?? b.items, "incidents.list");
      const total = typeof b.totalElements === "number" ? b.totalElements : typeof b.total === "number" ? b.total : items.length;
      return { items, page, size, total };
    },

    async getIncident(id) {
      try {
        const body = await get(`/incidents/${encodeURIComponent(id)}`);
        return isIncident(body) ? normaliseIncident(body) : null;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null;
        throw err;
      }
    },

    async getMaintenances() {
      return filterValid(await get("/maintenances", { state: "upcoming,in_progress" }), isMaintenance, "maintenances");
    },

    async getUptime(days) {
      return parseUptimeMap(await get("/uptime", { days }));
    },

    async subscribe(email) {
      if (!serverEnv.apiBaseUrl) throw new Error("GOLVIA_API_BASE_URL is not configured");
      await http.post(`${BASE}/subscribers`, { email });
    },
  };

  return repo;
}
