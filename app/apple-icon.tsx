import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Same glyph as app/icon.svg, full-bleed (iOS rounds the corners itself). */
export default function AppleIcon() {
  const { brand, background } = site.colors;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: brand, alignItems: "center", justifyContent: "center" }}>
        <svg width="132" height="132" viewBox="3 3 26 26">
          <rect x="11" y="5.5" width="10" height="6.5" rx="2" fill={background} />
          <rect x="4.5" y="20" width="9.5" height="6.5" rx="2" fill={background} />
          <rect x="18" y="20" width="9.5" height="6.5" rx="2" fill={background} />
          <path
            d="M16 12v3.5M9.25 20v-1.5a3 3 0 0 1 3-3h7.5a3 3 0 0 1 3 3V20"
            fill="none"
            stroke={background}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
