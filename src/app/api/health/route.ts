import { connection } from "next/server";

/** Liveness only: never calls downstream services. Used by Docker HEALTHCHECK. */
export async function GET() {
  await connection();
  return Response.json(
    { ok: true, version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
