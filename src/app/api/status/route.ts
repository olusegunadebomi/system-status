import { connection } from "next/server";
import { getStatusSummary } from "@/features/system-status/lib/status-service";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** Public status summary. Contains no probe URLs, hostnames or tokens. */
export async function GET() {
  await connection();
  const summary = await getStatusSummary();
  return Response.json(summary, {
    headers: {
      ...CORS,
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
