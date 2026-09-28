"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { KeyForm } from "@/components/key-form";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { site } from "@/lib/site";
import { clearSettings, useHydrated, useSettings } from "@/lib/storage";

interface AppConfig {
  /** Whether the server has a Tavily key, so web sources can be offered. */
  serverSearch: boolean;
  openSettings: () => void;
}

const AppConfigContext = createContext<AppConfig>({ serverSearch: false, openSettings: () => {} });
export const useAppConfig = () => useContext(AppConfigContext);

/**
 * Nothing past this gate renders until the visitor has connected their own AI
 * provider key. Optional web sources use the server owner's Tavily key.
 */
export function KeyGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const settings = useSettings();
  const [serverSearch, setServerSearch] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { serverSearch?: boolean }) => setServerSearch(Boolean(c.serverSearch)))
      .catch(() => setServerSearch(false));
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const value = useMemo(() => ({ serverSearch: !!serverSearch, openSettings }), [serverSearch, openSettings]);

  // This is also what the server renders, so crawlers get a real heading and description.
  if (!hydrated || serverSearch === null)
    return (
      <div className="h-full bg-background" aria-busy="true">
        <h1 className="sr-only">{site.title}</h1>
        <p className="sr-only">{site.description}</p>
      </div>
    );

  const unlocked = !!settings.apiKey && !!settings.provider && !!settings.model;
  if (!unlocked) return <Onboarding />;

  return (
    <AppConfigContext.Provider value={value}>
      {children}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Settings</DialogTitle>
            <DialogDescription>Change your AI provider, key or model.</DialogDescription>
          </DialogHeader>
          <KeyForm
            submitLabel="Save changes"
            onSaved={() => {
              setSettingsOpen(false);
              toast.success("Settings saved");
            }}
          />
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setSettingsOpen(false);
                clearSettings();
              }}
            >
              Remove key from this browser
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppConfigContext.Provider>
  );
}

const STEPS = [
  { n: "01", title: "Ask", text: "Enter any topic or question you want to understand." },
  { n: "02", title: "Watch it unfold", text: "Unfold draws how it works as a flow, top to bottom." },
  { n: "03", title: "Zoom in", text: "Open any step for details, or break it down further." },
];

function Onboarding() {
  return (
    <main className="grid h-full overflow-y-auto lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r bg-canvas p-12 lg:flex">
        <OnboardingBackdrop />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <h1 className="font-serif text-[64px] leading-[0.95] tracking-tight">
            How it works,
            <br />
            <em className="text-brand">mapped out.</em>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Ask how something works and get its flow — every stage, what passes between them, and what happens
            inside each one.
          </p>
        </div>
        <ol className="relative grid grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] text-brand">{s.n}</span>
              <span className="text-sm font-medium">{s.title}</span>
              <span className="text-[13px] leading-snug text-muted-foreground">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <Logo className="mb-10 lg:hidden" />
          <h2 className="font-serif text-4xl tracking-tight">Connect your AI</h2>
          <p className="mt-2 mb-8 text-sm leading-relaxed text-muted-foreground">
            Unfold runs on your own model. Paste a key from Anthropic, OpenAI, Gemini, OpenRouter or Groq to
            start researching.
          </p>
          <KeyForm submitLabel="Start researching" />
        </motion.div>
      </section>
    </main>
  );
}

/** A faint, static concept map drawn behind the onboarding copy. */
function OnboardingBackdrop() {
  const nodes = [
    { x: 72, y: 20, r: 7 },
    { x: 88, y: 38, r: 4 },
    { x: 60, y: 44, r: 5 },
    { x: 84, y: 62, r: 4 },
    { x: 66, y: 76, r: 3.5 },
    { x: 94, y: 12, r: 3 },
  ];
  const links = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [0, 5],
    [3, 4],
  ];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--edge)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r * 0.6} fill={i === 0 ? "var(--brand-soft)" : "var(--card)"} stroke="var(--edge)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
