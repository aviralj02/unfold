"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectProvider, getProvider, PROVIDERS, type ModelEntry, type ProviderId } from "@/lib/providers";
import { readSettings, saveSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Verified = { provider: ProviderId; key: string; models: ModelEntry[] };

type VerifyResponse =
  | { ok: true; provider: ProviderId; models: ModelEntry[]; defaultModel: string | null }
  | { ok: false; message: string };

async function requestModels(provider: ProviderId | null, apiKey: string): Promise<VerifyResponse> {
  const res = await fetch("/api/keys/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, provider: provider ?? undefined }),
  });
  return (await res.json()) as VerifyResponse;
}

/** Above this many models a free-text field with suggestions beats a dropdown. */
const SELECT_LIMIT = 60;

export function KeyForm({ submitLabel, onSaved }: { submitLabel: string; onSaved?: () => void }) {
  const [initial] = useState(readSettings);
  const [provider, setProvider] = useState<ProviderId | null>(initial.provider);
  const [providerPinned, setProviderPinned] = useState(false);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [shown, setShown] = useState(false);
  const [model, setModel] = useState(initial.model);
  const [verified, setVerified] = useState<Verified | null>(null);
  const [busy, setBusy] = useState(() => !!(initial.apiKey && initial.provider));
  const [error, setError] = useState<string | null>(null);

  const info = getProvider(provider);
  const trimmedKey = apiKey.trim();
  const isVerified = !!verified && verified.key === trimmedKey && verified.provider === provider;

  const hasSaved = !!(initial.apiKey && initial.provider);

  function applyResult(data: VerifyResponse, key: string) {
    if (!data.ok) {
      setError(data.message);
      return;
    }
    setProvider(data.provider);
    setVerified({ provider: data.provider, key, models: data.models });
    // Keep the saved model if this key can still use it.
    setModel((current) =>
      current && data.models.some((m) => m.id === current) ? current : (data.defaultModel ?? data.models[0]?.id ?? ""),
    );
  }

  async function verify() {
    if (!trimmedKey) {
      setError("Paste an API key to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      applyResult(await requestModels(provider, trimmedKey), trimmedKey);
    } catch {
      setError("Couldn't verify the key. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Settings: an existing connection loads its models straight away.
  useEffect(() => {
    if (!hasSaved) return;
    requestModels(initial.provider, initial.apiKey)
      .then((data) => applyResult(data, initial.apiKey))
      .catch(() => setError("Couldn't load models. Check your connection and try again."))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyChange(value: string) {
    setApiKey(value);
    setError(null);
    if (!providerPinned) {
      const detected = detectProvider(value);
      if (detected) setProvider(detected);
    }
  }

  function save() {
    if (!isVerified || !provider) return;
    const m = model.trim();
    if (!m) {
      setError("Choose a model.");
      return;
    }
    if (!saveSettings({ provider, apiKey: trimmedKey, model: m })) {
      setError("Your browser blocked local storage, so the key can't be kept. Allow site data and try again.");
      return;
    }
    onSaved?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isVerified) save();
        else void verify();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium">
          Provider
          <span className="text-xs font-normal text-muted-foreground">Detected from your key</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                provider === p.id ? "border-brand bg-brand-soft/70 text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => {
                  setProvider(p.id);
                  setProviderPinned(true);
                  setError(null);
                }}
                className="sr-only"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="api-key">API key</Label>
          {info && (
            <a
              href={info.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Get a key ↗
            </a>
          )}
        </div>
        <div className="relative">
          <Input
            id="api-key"
            type={shown ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder={info?.placeholder ?? "Paste your API key"}
            aria-invalid={!!error || undefined}
            className="h-10 pr-10 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={shown ? "Hide key" : "Show key"}
          >
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {isVerified && info && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-brand" /> Connected to {info.label} · {verified.models.length} models
            available
          </p>
        )}
      </div>

      {isVerified && <ModelField models={verified.models} value={model} onChange={setModel} />}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-10" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="animate-spin" /> Checking key…
          </>
        ) : isVerified ? (
          submitLabel
        ) : (
          "Connect"
        )}
      </Button>

      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Your key stays in this browser. It&apos;s sent with each research request and passed straight to your provider —
        never stored on the server.
      </p>
    </form>
  );
}

function ModelField({ models, value, onChange }: { models: ModelEntry[]; value: string; onChange: (v: string) => void }) {
  const label = (m: ModelEntry) => (m.label && m.label !== m.id ? `${m.label} (${m.id})` : m.id);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="model">Model</Label>
      {models.length <= SELECT_LIMIT ? (
        <div className="relative">
          <select
            id="model"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-input bg-transparent px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {label(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-muted-foreground" />
        </div>
      ) : (
        <>
          <Input
            id="model"
            list="model-options"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search models…"
            className="h-10 font-mono text-[13px]"
          />
          <datalist id="model-options">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
        </>
      )}
      <p className="text-xs text-muted-foreground">Larger models write better maps; smaller ones are faster and cheaper.</p>
    </div>
  );
}
