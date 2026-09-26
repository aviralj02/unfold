import "server-only";
import type { ResearchSource } from "@/lib/types";

export class SearchAuthError extends Error {}

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

const TAVILY_URL = "https://api.tavily.com/search";
const SNIPPET_LIMIT = 700;

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function tavilySearch(query: string, apiKey: string, maxResults: number, signal?: AbortSignal) {
  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults, include_answer: false }),
    signal,
  });
  if (res.status === 401 || res.status === 403) throw new SearchAuthError("The Tavily API key was rejected.");
  if (!res.ok) throw new Error(`Search failed (${res.status}).`);
  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}

/**
 * Runs every query in parallel and returns de-duplicated sources. A single
 * failing query is tolerated; an auth failure is not.
 */
export async function searchWeb(
  queries: string[],
  apiKey: string,
  { maxPerQuery = 4, maxTotal = 14, signal }: { maxPerQuery?: number; maxTotal?: number; signal?: AbortSignal } = {},
): Promise<ResearchSource[]> {
  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, apiKey, maxPerQuery, signal)));

  const authFailure = settled.find((s) => s.status === "rejected" && s.reason instanceof SearchAuthError);
  if (authFailure && authFailure.status === "rejected") throw authFailure.reason;

  const seen = new Set<string>();
  const sources: ResearchSource[] = [];
  // Interleave results so every research angle is represented before any gets a second slot.
  const lists = settled.map((s) => (s.status === "fulfilled" ? s.value : []));
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && sources.length < maxTotal; i++) {
    for (const list of lists) {
      const r = list[i];
      if (!r?.url || !/^https?:\/\//.test(r.url)) continue;
      const key = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        title: r.title?.trim() || domainOf(r.url),
        url: r.url,
        domain: domainOf(r.url),
        snippet: r.content?.replace(/\s+/g, " ").trim().slice(0, SNIPPET_LIMIT),
      });
      if (sources.length >= maxTotal) break;
    }
  }

  if (sources.length === 0 && settled.every((s) => s.status === "rejected")) {
    const first = settled[0] as PromiseRejectedResult | undefined;
    throw first?.reason instanceof Error ? first.reason : new Error("Search failed.");
  }
  return sources;
}
