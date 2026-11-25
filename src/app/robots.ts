import type { MetadataRoute } from "next";
import { publicEnv } from "@/features/system-status/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
