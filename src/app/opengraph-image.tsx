import { ImageResponse } from "next/og";

export const alt = "Golvia System Status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static branded card, generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1a45 0%, #1d69d8 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3373e0", fontSize: 36 }}>
            G
          </div>
          Golvia
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>System Status</div>
          <div style={{ fontSize: 34, opacity: 0.85 }}>Live health of Golvia services, incidents and maintenance</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#48c563" }} />
          status.golvia.app
        </div>
      </div>
    ),
    size,
  );
}
