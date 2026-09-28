import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Canvases live in each visitor's browser, so there's nothing to index there.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/canvas/"] },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
