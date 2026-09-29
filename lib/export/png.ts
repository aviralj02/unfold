"use client";

import { toPng } from "html-to-image";
import { site } from "@/lib/site";

/** Elements with this class (hover buttons, loading shimmer) are left out of exports. */
export const EXPORT_HIDDEN = "export-hidden";

const PADDING = 56;
const HEADER = 96;
const FOOTER = 56;
const CANVAS_BG = "#f7f5f2";
/** Browsers cap canvas size; stay well under it for very large flows. */
const MAX_SIDE = 12000;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function cssFont(variable: string, fallback: string) {
  const family = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return family || fallback;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders the whole flow (not just what's on screen) to a PNG data URL,
 * framed with the canvas title and a small footer.
 */
export async function renderFlowPng(viewport: HTMLElement, bounds: Bounds, title: string): Promise<string> {
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const ratio = Math.min(2, MAX_SIDE / Math.max(width, height + HEADER + FOOTER));

  const flow = await toPng(viewport, {
    backgroundColor: CANVAS_BG,
    width,
    height,
    pixelRatio: ratio,
    filter: (node) => !(node instanceof Element && node.classList.contains(EXPORT_HIDDEN)),
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${PADDING - bounds.x}px, ${PADDING - bounds.y}px) scale(1)`,
    },
  });

  const serif = cssFont("--font-instrument-serif", "Georgia, serif");
  const sans = cssFont("--font-geist-sans", "system-ui, sans-serif");
  await Promise.all([document.fonts.load(`40px ${serif}`), document.fonts.load(`14px ${sans}`)]).catch(() => {});

  const img = await loadImage(flow);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height + (HEADER + FOOTER) * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return flow;

  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, HEADER * ratio);

  ctx.scale(ratio, ratio);
  ctx.textBaseline = "middle";
  ctx.fillStyle = site.colors.foreground;
  ctx.font = `44px ${serif}`;
  ctx.fillText(title, PADDING, HEADER / 2 + 12, width - PADDING * 2);

  const footerY = HEADER + height + FOOTER / 2 - 8;
  ctx.fillStyle = site.colors.brand;
  ctx.beginPath();
  ctx.roundRect(PADDING, footerY - 8, 16, 16, 4);
  ctx.fill();
  ctx.fillStyle = site.colors.muted;
  ctx.font = `14px ${sans}`;
  ctx.fillText("Made with Unfold", PADDING + 24, footerY);

  return canvas.toDataURL("image/png");
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(text: string, filename: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
