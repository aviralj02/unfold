import type { Metadata } from "next";

// Canvases are private to the visitor's browser: keep them out of search results.
export const metadata: Metadata = {
  title: "Canvas",
  robots: { index: false, follow: false },
};

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
