"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getVentures } from "@/lib/store/ventures";
import { safeBuildCeoOfficeData, type CeoOfficeData } from "@/lib/ceo-office";

export interface CeoOfficeSnapshot {
  data: CeoOfficeData | null;
  error: string | null;
  ready: boolean;
}

const EMPTY_SNAPSHOT: CeoOfficeSnapshot = { data: null, error: null, ready: false };

let cache: CeoOfficeSnapshot | null = null;
let loadScheduled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function loadSnapshot(): CeoOfficeSnapshot {
  console.log("[ceo-office] Loading ventures");
  const ventures = getVentures();
  console.log("[ceo-office] Building CEO data", { ventureCount: ventures.length });

  const result = safeBuildCeoOfficeData(ventures);
  console.log("[ceo-office] CEO data generated", { degraded: !!result.error });

  return {
    data: result.data,
    error: result.error,
    ready: true,
  };
}

function scheduleLoad(): void {
  if (cache || loadScheduled || typeof window === "undefined") return;
  loadScheduled = true;

  queueMicrotask(() => {
    loadScheduled = false;
    if (cache) return;

    try {
      cache = loadSnapshot();
    } catch (error) {
      console.error("[ceo-office] loadSnapshot failed:", error);
      cache = {
        data: null,
        error: error instanceof Error ? error.message : "Error al cargar CEO Office",
        ready: true,
      };
    }
    emit();
  });
}

function getSnapshot(): CeoOfficeSnapshot {
  if (cache) return cache;
  scheduleLoad();
  return EMPTY_SNAPSHOT;
}

function getServerSnapshot(): CeoOfficeSnapshot {
  return EMPTY_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  scheduleLoad();
  return () => listeners.delete(listener);
}

export function invalidateCeoOfficeCache(): void {
  cache = null;
  loadScheduled = false;
  emit();
}

export function useCeoOfficeData(): CeoOfficeSnapshot & { retry: () => void } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const retry = useCallback(() => {
    console.log("[ceo-office] Retry requested");
    invalidateCeoOfficeCache();
    scheduleLoad();
  }, []);

  return { ...snapshot, retry };
}
