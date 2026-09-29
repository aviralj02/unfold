import "server-only";
import type { ErrorCode } from "@/lib/types";
import { SearchAuthError } from "./search";

/** Maps SDK/HTTP errors from any provider to a message the user can act on. */
export function describeError(err: unknown, providerLabel: string): { message: string; code: ErrorCode } {
  if (err instanceof SearchAuthError) {
    return { code: "search_auth", message: "Web search is unavailable right now (the server's search key was rejected)." };
  }
  const e = err as { status?: number; name?: string; message?: string; lc_error_code?: string };
  const status = e?.status;
  const msg = e?.message ?? "";

  if (status === 401 || e?.lc_error_code === "MODEL_AUTHENTICATION" || /API_KEY_INVALID|API key not valid|invalid api key|incorrect api key/i.test(msg)) {
    return { code: "auth", message: `Your ${providerLabel} key was rejected. Check it in Settings.` };
  }
  if (status === 403) {
    return { code: "auth", message: `Your ${providerLabel} key doesn't have access to this model. Pick another model in Settings.` };
  }
  if (status === 402 || /insufficient_quota|credit|billing/i.test(msg)) {
    return { code: "rate_limit", message: `Your ${providerLabel} account is out of credits or quota.` };
  }
  if (status === 429 || e?.lc_error_code === "MODEL_RATE_LIMIT" || /rate limit|RESOURCE_EXHAUSTED/i.test(msg)) {
    return { code: "rate_limit", message: `Rate limit reached on your ${providerLabel} account. Wait a moment and retry.` };
  }
  if (status === 404 || /model.*(not found|does not exist)|NOT_FOUND/i.test(msg)) {
    return { code: "auth", message: `That model isn't available for your ${providerLabel} key. Pick another in Settings.` };
  }
  if (/tool_use_failed|did not call a tool|failed to call a function/i.test(msg)) {
    return {
      code: "invalid_output",
      message: "This model struggled to return a structured answer. Retry, or pick a larger model in Settings.",
    };
  }
  if (e?.name === "AbortError" || e?.name === "TimeoutError" || /abort|timed? ?out/i.test(msg)) {
    return { code: "timeout", message: "Research took too long and was stopped. Try again, or a narrower question." };
  }
  if (status && status >= 500) {
    return { code: "unknown", message: `${providerLabel}'s API had a temporary problem. Retry in a moment.` };
  }
  return { code: "unknown", message: "Something went wrong while researching. Please retry." };
}
