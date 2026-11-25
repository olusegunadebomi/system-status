import { connection } from "next/server";
import { getUptimePayload } from "@/features/system-status/lib/status-service";

export async function GET() {
  await connection();
  const payload = await getUptimePayload(90);
  return Response.json(payload, {
    headers: {
      "Cache-Control": payload.uptime
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "public, s-maxage=15",
    },
  });
}
