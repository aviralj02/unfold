import { KeyRejectedError, listModels } from "@/lib/ai/provider-models";
import { detectProvider, getProvider } from "@/lib/providers";

/**
 * Checks a user's key against its provider and returns the models it can use.
 * The key is used for this one request and never stored.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { apiKey?: string; provider?: string } | null;
  const apiKey = body?.apiKey?.trim();
  if (!apiKey) return Response.json({ ok: false, message: "Enter an API key." }, { status: 400 });

  const provider = getProvider(body?.provider)?.id ?? detectProvider(apiKey);
  if (!provider) {
    return Response.json({ ok: false, message: "Couldn't tell which provider this key is for. Pick one above." }, { status: 400 });
  }
  const label = getProvider(provider)!.label;

  try {
    const { models, defaultModel } = await listModels(provider, apiKey);
    if (!models.length) {
      return Response.json({ ok: false, message: `This ${label} key has no chat models available.` });
    }
    return Response.json({ ok: true, provider, models, defaultModel });
  } catch (err) {
    if (err instanceof KeyRejectedError) {
      return Response.json({ ok: false, message: `This key was rejected by ${label}. Check the key and the provider.` });
    }
    return Response.json({ ok: false, message: `Couldn't reach ${label} to check the key. Try again.` });
  }
}
