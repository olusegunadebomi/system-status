import { connection } from "next/server";
import { publicEnv } from "@/features/system-status/lib/public-env";
import { PHASE_LABEL, SEVERITY_META } from "@/features/system-status/lib/status-meta";
import { getComponentNames, listIncidents } from "@/features/system-status/lib/status-service";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** RSS 2.0 feed of the 50 most recent incidents. */
export async function GET() {
  await connection();
  const site = publicEnv.siteUrl;
  const list = await listIncidents({ page: 0, size: 50 });
  const names = getComponentNames();

  const items = (list?.items ?? [])
    .map((i) => {
      const link = `${site}/incidents/${encodeURIComponent(i.id)}`;
      const affected = i.componentIds.map((id) => names[id] ?? id).join(", ");
      const updates = i.updates
        .map((u) => `<p><strong>${PHASE_LABEL[u.phase]}</strong> (${new Date(u.createdAt).toUTCString()}): ${esc(u.body)}</p>`)
        .join("");
      const body = `<p>Severity: ${SEVERITY_META[i.severity].label}. Affected: ${esc(affected)}</p>${updates}`;
      const pubDate = new Date(i.updates[0]?.createdAt ?? i.startedAt).toUTCString();
      return `    <item>
      <title>${esc(`[${PHASE_LABEL[i.phase]}] ${i.title}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${body.replace(/]]>/g, "]]]]><![CDATA[>")}]]></description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Golvia Status: Incidents</title>
    <link>${site}</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Incidents and updates for Golvia services</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
