import "server-only";
import { serverEnv } from "./lib/env";

export type ProbeSpec =
  | {
      kind: "http";
      url: string | undefined;
      method?: "GET" | "HEAD";
      /** Which HTTP status codes count as "up". Default: 2xx/3xx. */
      accept?: "success" | "reachable";
    }
  /** A named component inside the backend health payload (Spring Actuator style). */
  | { kind: "health"; component: string }
  | { kind: "sockjs"; url: string | undefined }
  | { kind: "s3"; url: string | undefined };

export interface ComponentConfig {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  /** All specs must pass for the component to be up. */
  probe: ProbeSpec[] | null;
}

export interface GroupConfig {
  id: string;
  name: string;
}

export const GROUPS: GroupConfig[] = [
  { id: "core", name: "Core platform" },
  { id: "social", name: "Social" },
  { id: "realtime", name: "Real-time" },
  { id: "commerce", name: "Commerce & money" },
  { id: "opportunities", name: "Opportunities" },
  { id: "media", name: "Media & infrastructure" },
  { id: "support", name: "Support" },
  { id: "mobile", name: "Mobile apps" },
];

const env = serverEnv;
const api = (path: string) =>
  env.apiBaseUrl ? `${env.apiBaseUrl}${path}` : undefined;

/**
 * TODO(backend): once the health endpoint exposes per-service components,
 * replace the `null` probes below with `[{ kind: "health", component: "<name>" }]`.
 * Component names must match the keys in the health payload's `components` map.
 */
export function getComponentCatalogue(): ComponentConfig[] {
  const coreHealth: ProbeSpec[] | null = env.healthPath
    ? [{ kind: "http", url: api(env.healthPath) }]
    : null; // TODO(backend): set GOLVIA_HEALTH_PATH (e.g. /actuator/health)

  return [
    // ── Core platform
    {
      id: "web-app",
      name: "Web App",
      description: "golvia.app website and web client",
      groupId: "core",
      probe: [{ kind: "http", url: env.webUrl }],
    },
    {
      id: "core-api",
      name: "Core API",
      description: "The REST API used by web and mobile apps",
      groupId: "core",
      probe: coreHealth,
    },
    {
      id: "auth",
      name: "Authentication & Sign-in",
      description: "Email sign-in, Google Sign-In and reCAPTCHA",
      groupId: "core",
      probe: null, // TODO(backend): { kind: "health", component: "auth" }
    },
    {
      id: "kyc",
      name: "Account verification & KYC",
      groupId: "core",
      probe: null, // TODO(backend)
    },

    // ── Social
    { id: "feed", name: "Feed & Posts", groupId: "social", probe: null }, // TODO(backend)
    { id: "stories", name: "Stories", groupId: "social", probe: null }, // TODO(backend)
    { id: "music", name: "Music on posts", groupId: "social", probe: null }, // TODO(backend)
    {
      id: "network",
      name: "Network & Connections",
      groupId: "social",
      probe: null,
    }, // TODO(backend)
    { id: "explore", name: "Search & Explore", groupId: "social", probe: null }, // TODO(backend)
    { id: "communities", name: "Communities", groupId: "social", probe: null }, // TODO(backend)
    { id: "channels", name: "Channels", groupId: "social", probe: null }, // TODO(backend)
    {
      id: "notifications",
      name: "Notifications",
      groupId: "social",
      probe: null,
    }, // TODO(backend)

    // ── Real-time
    {
      id: "messaging",
      name: "Messaging",
      description: "Real-time chat connection",
      groupId: "realtime",
      probe: env.wsUrl ? [{ kind: "sockjs", url: env.wsUrl }] : null,
    },
    {
      id: "presence",
      name: "Presence",
      description: "Online indicators",
      groupId: "realtime",
      probe: null,
    }, // TODO(backend)
    {
      id: "calls",
      name: "Voice & Video Calls",
      groupId: "realtime",
      probe: null, // TODO: Agora RTC has no probe yet; consider a backend token-issue check
    },
    {
      id: "live",
      name: "Go Live & Streaming",
      description: "Live broadcasts and playback",
      groupId: "realtime",
      probe: null, // TODO(backend): health component for /api/v1/livestreams
    },
    { id: "pitchside", name: "Pitchside", groupId: "realtime", probe: null }, // TODO(backend)

    // ── Commerce & money
    {
      id: "wallet",
      name: "Wallet",
      description: "GoCoin balance and top-ups",
      groupId: "commerce",
      probe: null,
    }, // TODO(backend)
    {
      id: "gifting",
      name: "Gifting & Payments",
      groupId: "commerce",
      probe: null,
    }, // TODO(backend)
    {
      id: "premium",
      name: "Premium subscriptions",
      groupId: "commerce",
      probe: null,
    }, // TODO(backend)
    {
      id: "marketplace",
      name: "Marketplace",
      description: "Cart, checkout and order tracking",
      groupId: "commerce",
      probe: null, // TODO(backend)
    },
    { id: "badges", name: "Badges & Growth", groupId: "commerce", probe: null }, // TODO(backend)

    // ── Opportunities
    {
      id: "jobs",
      name: "Job Center",
      description: "Professional, Artisan and Company registration, CVs",
      groupId: "opportunities",
      probe: null, // TODO(backend)
    },

    // ── Media & infrastructure
    {
      id: "media-storage",
      name: "Media Uploads & Storage",
      groupId: "media",
      probe: env.s3ProbeUrl ? [{ kind: "s3", url: env.s3ProbeUrl }] : null,
    },
    {
      id: "media-delivery",
      name: "Media delivery",
      description: "Images, video and audio served to apps",
      groupId: "media",
      probe: null, // TODO: add a CDN-hosted probe object once a CDN URL is confirmed
    },

    // ── Support
    {
      id: "support",
      name: "Support & Appeals",
      description: "Help requests, appeals and moderation actions",
      groupId: "support",
      // POST-only route: a GET returns 405, which proves the handler is serving.
      probe: [
        {
          kind: "http",
          url: `${env.webUrl}/api/v1/support/appeals/public`,
          accept: "reachable",
        },
      ],
    },

    // ── Mobile apps
    { id: "android", name: "Android app", groupId: "mobile", probe: null },
    { id: "ios", name: "iOS app", groupId: "mobile", probe: null },
    {
      id: "deep-links",
      name: "Deep links",
      description: "Opening golvia.app links in the mobile apps",
      groupId: "mobile",
      probe: [
        { kind: "http", url: `${env.webUrl}/.well-known/assetlinks.json` },
        {
          kind: "http",
          url: `${env.webUrl}/.well-known/apple-app-site-association`,
        },
      ],
    },
  ];
}

/** Public, non-sensitive view of the catalogue (safe to ship to the browser). */
export function getPublicCatalogue() {
  return getComponentCatalogue().map(({ id, name, groupId, description }) => ({
    id,
    name,
    groupId,
    description,
  }));
}
