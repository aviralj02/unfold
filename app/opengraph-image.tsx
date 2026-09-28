import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const c = site.colors;
const EDGE = "#bcb6af";

function Mark({ size: s }: { size: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill={c.brand} />
      <rect x="11" y="5.5" width="10" height="6.5" rx="2" fill={c.background} />
      <rect x="4.5" y="20" width="9.5" height="6.5" rx="2" fill={c.background} />
      <rect x="18" y="20" width="9.5" height="6.5" rx="2" fill={c.background} />
      <path
        d="M16 12v3.5M9.25 20v-1.5a3 3 0 0 1 3-3h7.5a3 3 0 0 1 3 3V20"
        fill="none"
        stroke={c.background}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Card({ kind, tint, ink, title, width = 250 }: { kind: string; tint: string; ink: string; title: string; width?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        padding: "16px 20px",
        background: "#ffffff",
        border: `2px solid ${c.border}`,
        borderRadius: 18,
        boxShadow: "0 10px 24px -14px rgba(60,40,20,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          padding: "3px 10px",
          borderRadius: 8,
          background: tint,
          color: ink,
          fontSize: 15,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {kind}
      </div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: c.foreground }}>{title}</div>
    </div>
  );
}

const Line = ({ h = 34 }: { h?: number }) => <div style={{ display: "flex", width: 3, height: h, background: EDGE }} />;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          background: c.background,
                    fontFamily: "sans-serif",
        }}
      >
        {/* Left: brand + message */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Mark size={56} />
            <div style={{ display: "flex", fontSize: 44, color: c.foreground, letterSpacing: -1 }}>Unfold</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 92, lineHeight: 1, letterSpacing: -3, color: c.foreground }}>
              How does it
            </div>
            <div style={{ display: "flex", fontSize: 92, lineHeight: 1.05, letterSpacing: -3, color: c.brand }}>work?</div>
            <div style={{ display: "flex", marginTop: 28, maxWidth: 520, fontSize: 30, lineHeight: 1.35, color: c.muted }}>
              Ask about any system, tool or process. Get its flow, step by step.
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 20, color: c.muted }}>
            Free to use with your own AI key
          </div>
        </div>

        {/* Right: a small flow */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Card kind="Start" tint="#ffeadc" ink="#b4552a" title="User question" />
          <Line />
          <Card kind="Step" tint="#f1eeea" ink="#5b544e" title="Retriever" />
          <Line h={22} />
          <div
            style={{
              display: "flex",
              width: 250,
              height: 24,
              borderTop: `3px solid ${EDGE}`,
              borderLeft: `3px solid ${EDGE}`,
              borderRight: `3px solid ${EDGE}`,
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            }}
          />
          <div style={{ display: "flex", gap: 24 }}>
            <Card kind="External" tint="#e9ebfb" ink="#4a55a2" title="Chat model" width={226} />
            <Card kind="Result" tint="#e2f4e6" ink="#2f7a45" title="Answer" width={226} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
