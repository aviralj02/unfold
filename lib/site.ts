/** Public site details used by metadata, the OG image, robots and sitemap. */
export const site = {
  name: "Unfold",
  title: "Unfold: see how anything works, as a flow",
  tagline: "Ask how something works. Get the flow.",
  description:
    "Ask how any system, tool or process works and get an interactive flow diagram: every step, what passes between them, and a breakdown of any step. Works with your own Anthropic, OpenAI, Gemini, OpenRouter or Groq key.",
  keywords: [
    "flow diagram",
    "how does it work",
    "AI diagram generator",
    "architecture diagram",
    "system design",
    "visual learning",
    "research canvas",
    "LangChain",
    "React Flow",
  ],
  colors: { brand: "#c26030", background: "#faf9f6", foreground: "#201b16", muted: "#69625d", border: "#e1ddd8" },
};

/** Canonical origin: set NEXT_PUBLIC_SITE_URL in production; Vercel's URL is used when available. */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);
