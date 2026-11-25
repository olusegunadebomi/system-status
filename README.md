# Golvia System Status

The public status page for Golvia, served at **status.golvia.app**. It is a standalone Next.js 16 app that shares no runtime with golvia.app, so it stays up when the main app is down.

- **Live component health** comes from this app's own server-side probes (HTTP, SockJS/STOMP, S3).
- **Incidents, maintenance and uptime history** come from the Golvia backend at `/api/v1/system-status/*`. Outside production, sample data is used instead.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in what you have; everything is optional in dev
pnpm dev                     # http://localhost:3000, uses sample data
pnpm test                    # vitest
pnpm build && pnpm start
```

To preview other page states, set `STATUS_MOCK_SCENARIO` to `operational`, `degraded`, `partial`, `major` or `maintenance`. It works in dev, or in a production build when `STATUS_MOCK=1` is also set. The sample data always has one minor incident active, so the overall banner shows at least "degraded".

## How it works

| Route | What it does |
|---|---|
| `/` | Status page. The static shell is prerendered and live status streams in from the server, then the client polls every 30s. |
| `/incidents/[id]` | Shareable incident page with Open Graph metadata |
| `/history?month=YYYY-MM&page=N` | Incident history by month |
| `/api/status` | Public JSON `StatusSummary` (CORS `*`, `s-maxage=30`) |
| `/api/status/uptime` | Cached proxy for 90-day uptime history |
| `/api/subscribe` | Email subscription. Rate limited to 5 per hour per IP; the backend sends the double opt-in email. |
| `/feed.xml` | RSS 2.0 feed of the last 50 incidents |
| `/api/health` | Liveness check for Docker. Calls no other services. |

Probe rules:
- A response slower than 2s counts as **degraded**.
- One failure makes a component **degraded**. Two failures in a row make it an **outage**: partial if only some of its checks failed, major if all did.
- It takes two successes in a row to recover.

Results are cached in memory for 30s (5s after a failure), and concurrent requests share a single probe run. Visitor traffic therefore never multiplies the load on Golvia.

Each component's displayed status is the worst of three signals: its probe result, any active incident that affects it, and any maintenance in progress on it. Groups and the overall banner show the worst status among their components.

The backend is optional at runtime. If it can't be reached, probe results still render and the page shows "Incident details temporarily unavailable".

Each probe run writes one JSON log line per component (`component`, `ok`, `status`, `latencyMs`).

## Add a component

1. Open [`src/features/system-status/status-config.ts`](src/features/system-status/status-config.ts).
2. Add an entry to `getComponentCatalogue()`:
   ```ts
   { id: "payouts", name: "Payouts", description: "Withdrawals to bank accounts", groupId: "commerce",
     probe: [{ kind: "health", component: "payouts" }] }
   ```
   - `probe: null` means the status comes only from incidents. The page marks these as updated by the team.
   - Probe kinds:
     - `http` (`accept: "reachable"` treats any status below 500 as up)
     - `health` (a named component in the Actuator-style health payload)
     - `sockjs`
     - `s3`
   - Probe URLs stay on the server. Never put secrets in this file.
3. Use the same `id` in backend incidents (`componentIds`) and uptime data.

To add a group, add it to `GROUPS` in the same file.

## Post an incident

Staff post incidents through the Golvia backend or admin tool. The status page reads them from:

```
GET /api/v1/system-status/incidents?state=active
GET /api/v1/system-status/incidents?from&to&page&size   (array or Spring page)
GET /api/v1/system-status/incidents/{id}
```

Incident shape (see [`types.ts`](src/features/system-status/types.ts)):

```json
{ "id": "inc-123", "title": "Delayed message delivery", "severity": "minor|major|critical",
  "phase": "investigating|identified|monitoring|resolved", "componentIds": ["messaging"],
  "startedAt": "ISO", "resolvedAt": "ISO?", "updates": [{ "id": "u1", "phase": "identified", "body": "…", "createdAt": "ISO" }] }
```

Severity sets the status of the affected components: minor makes them degraded, major a partial outage, and critical a major outage. Malformed items are logged and dropped, never shown. New incidents appear within about 30s.

## Schedule maintenance

```
GET /api/v1/system-status/maintenances?state=upcoming,in_progress
```

```json
{ "id": "mnt-1", "title": "Wallet database upgrade", "body": "…", "componentIds": ["wallet", "gifting"],
  "scheduledStart": "ISO", "scheduledEnd": "ISO", "status": "scheduled|in_progress|completed" }
```

During the window, the affected components show **Under maintenance** even if the backend still says `scheduled`. Windows that have ended are hidden. Visitors see times in their own timezone.

## Outstanding backend work

- [ ] A health endpoint with a per-service `components` map. Set `GOLVIA_HEALTH_PATH`, then replace the `TODO(backend)` probes in `status-config.ts`.
- [ ] The `/api/v1/system-status/*` endpoints, `GOLVIA_STATUS_API_TOKEN`, and a daily uptime aggregation job (`GET …/uptime?days=90` returns `Record<componentId, DailyUptime[]>`)
- [ ] `POST …/subscribers`
- [ ] A public 1-byte `status-probe.txt` in the `golviadocsbucket` S3 bucket

## Deploy (Docker)

```bash
docker build -t golvia-status .
docker run -p 3000:3000 --env-file .env.production golvia-status
```

The image uses `node:22-alpine`, runs as the non-root `golvia` user, and serves the standalone `server.js` on port 3000. Its `HEALTHCHECK` hits `/api/health`.

## After launch, in golvia-frontend

- Add a "System Status" link to `src/components/layout/LandingFooter.tsx`.
- Optional: poll `https://status.golvia.app/api/status` every 2 minutes and show a dismissible banner in `src/app/(main)/layout.tsx` when the status isn't operational.
