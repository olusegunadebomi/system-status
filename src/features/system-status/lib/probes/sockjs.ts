import { httpProbe } from "./http";
import type { ProbeOptions, ProbeOutcome } from "./types";

/**
 * Probe a SockJS + STOMP endpoint (Golvia messaging at `${API}/ws`).
 *
 * 1. GET {url}/info: the SockJS info endpoint must answer.
 * 2. Open the raw WebSocket transport, wait for the SockJS open frame ("o"),
 *    send a STOMP CONNECT and wait for CONNECTED or ERROR.
 *
 * An ERROR frame (e.g. "unauthorised") still proves the broker is up, so it
 * counts as reachable. Only transport failure or a timeout counts as down.
 */
export async function sockjsProbe(url: string, opts: ProbeOptions): Promise<ProbeOutcome> {
  const started = performance.now();
  const info = await httpProbe({ url: `${url}/info?t=${Date.now()}` }, opts);
  if (!info.ok) return { ...info, reason: `info_${info.reason}` };

  if (typeof WebSocket === "undefined") return info; // runtime without WebSocket: info is the best signal

  const remaining = Math.max(500, opts.timeoutMs - info.latencyMs);
  const server = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const session = Math.random().toString(36).slice(2, 10);
  const wsUrl = `${url.replace(/^http/i, "ws")}/${server}/${session}/websocket`;

  return new Promise<ProbeOutcome>((resolve) => {
    let settled = false;
    let ws: WebSocket | undefined;
    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {}
      resolve({ ok, latencyMs: Math.round(performance.now() - started), reason });
    };
    const timer = setTimeout(() => finish(false, "ws_timeout"), remaining);

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      finish(false, "ws_construct");
      return;
    }
    ws.onerror = () => finish(false, "ws_error");
    ws.onclose = () => finish(false, "ws_closed");
    ws.onmessage = (event) => {
      const data = typeof event.data === "string" ? event.data : "";
      if (data === "o") {
        const frame = "CONNECT\naccept-version:1.2,1.1\nheart-beat:0,0\n\n\u0000";
        ws?.send(JSON.stringify([frame]));
        return;
      }
      if (data.startsWith("a")) {
        if (data.includes("CONNECTED") || data.includes("ERROR")) finish(true);
        return;
      }
      if (data.startsWith("c")) finish(true, "sockjs_closed_by_server"); // handshake completed
    };
  });
}
