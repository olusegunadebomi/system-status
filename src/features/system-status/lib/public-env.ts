/** Values that are safe to expose to the browser. */
export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://status.golvia.app").replace(/\/+$/, ""),
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || "https://golvia.app").replace(/\/+$/, ""),
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL || undefined,
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL || undefined,
  /** Build year; avoids reading the clock during prerender. */
  year: process.env.NEXT_PUBLIC_BUILD_YEAR || "2026",
};
