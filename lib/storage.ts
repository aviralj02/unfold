"use client";

import { useSyncExternalStore } from "react";
import type { ProviderId } from "@/lib/providers";
import type { ResearchCanvas } from "@/lib/types";

/* ---------- tiny localStorage-backed store ---------- */

function createStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cachedValue;
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cachedValue = fallback;
    }
    return cachedValue;
  }

  /** Returns false when the browser refuses the write (quota, private mode). */
  function write(next: T): boolean {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      return false;
    }
    listeners.forEach((l) => l());
    return true;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, useValue };
}

/* ---------- settings (bring-your-own keys) ---------- */

export interface Settings {
  provider: ProviderId | null;
  apiKey: string;
  model: string;
}

const EMPTY_SETTINGS: Settings = { provider: null, apiKey: "", model: "" };
const settingsStore = createStore<Settings>("unfold:settings", EMPTY_SETTINGS);

/** Earlier builds stored an Anthropic-only shape; read it as an Anthropic connection. */
function normalize(raw: Partial<Settings> & { anthropicKey?: string }): Settings {
  if (raw.apiKey !== undefined) return { ...EMPTY_SETTINGS, ...raw };
  if (raw.anthropicKey) return { provider: "anthropic", apiKey: raw.anthropicKey, model: raw.model || "claude-opus-5" };
  return EMPTY_SETTINGS;
}

let lastRaw: Settings | undefined;
let lastNormalized = EMPTY_SETTINGS;
function normalized(raw: Settings) {
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastNormalized = normalize(raw);
  }
  return lastNormalized;
}

export const useSettings = () => normalized(settingsStore.useValue());
export const readSettings = () => normalized(settingsStore.read());
export const saveSettings = (s: Settings) => settingsStore.write(s);
export const clearSettings = () => settingsStore.write(EMPTY_SETTINGS);

/** True once `useSyncExternalStore` has read the real client value. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ---------- canvases ---------- */

const canvasStore = createStore<ResearchCanvas[]>("unfold:canvases", []);

export const useCanvases = canvasStore.useValue;

export function getCanvas(id: string) {
  return canvasStore.read().find((c) => c.id === id) ?? null;
}

export function upsertCanvas(canvas: ResearchCanvas): boolean {
  const all = canvasStore.read();
  const i = all.findIndex((c) => c.id === canvas.id);
  const next = i === -1 ? [canvas, ...all] : all.map((c) => (c.id === canvas.id ? canvas : c));
  return canvasStore.write(next);
}

export function updateCanvas(id: string, patch: Partial<ResearchCanvas>): boolean {
  const existing = getCanvas(id);
  if (!existing) return false;
  return upsertCanvas({ ...existing, ...patch, updatedAt: Date.now() });
}

export function deleteCanvas(id: string): boolean {
  return canvasStore.write(canvasStore.read().filter((c) => c.id !== id));
}
