import type { MetadataRoute } from "next";
import { publicEnv } from "@/features/system-status/lib/public-env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${publicEnv.siteUrl}/`, changeFrequency: "always", priority: 1 },
    { url: `${publicEnv.siteUrl}/history`, changeFrequency: "daily", priority: 0.6 },
  ];
}
