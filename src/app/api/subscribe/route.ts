import { clientIp, createRateLimiter } from "@/features/system-status/lib/rate-limit";
import { getRepository } from "@/features/system-status/lib/status-service";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const rl = limiter.check(clientIp(request.headers));
  if (!rl.ok) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL.test(email.trim())) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Backend sends the double opt-in confirmation email.
    await getRepository().subscribe(email.trim().toLowerCase());
    return Response.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error(JSON.stringify({ msg: "subscribe_failed", error: (err as Error)?.message }));
    return Response.json({ error: "Subscription service unavailable" }, { status: 502 });
  }
}
