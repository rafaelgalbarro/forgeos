"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getVentures } from "@/lib/store/ventures";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import {
  buildCeoWorkspaceDataHeuristic,
  type CeoWorkspaceData,
} from "@/lib/ceo-workspace";

export interface CeoWorkspaceSnapshot {
  data: CeoWorkspaceData | null;
  error: string | null;
  ready: boolean;
  loading: boolean;
}

const EMPTY: CeoWorkspaceSnapshot = {
  data: null,
  error: null,
  ready: false,
  loading: false,
};

let cache: CeoWorkspaceSnapshot | null = null;
let loadScheduled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function fetchWorkspace(): Promise<CeoWorkspaceSnapshot> {
  ensureVandlSeeded();
  const ventures = getVentures();
  const heuristic = buildCeoWorkspaceDataHeuristic(ventures);

  try {
    const response = await fetch("/api/ceo-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventures }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return {
        data: heuristic,
        error: body.error ?? `API ${response.status}`,
        ready: true,
        loading: false,
      };
    }

    const data = (await response.json()) as CeoWorkspaceData;
    return { data, error: null, ready: true, loading: false };
  } catch (error) {
    return {
      data: heuristic,
      error: error instanceof Error ? error.message : "Error al cargar CEO Workspace",
      ready: true,
      loading: false,
    };
  }
}

function scheduleLoad(): void {
  if (cache?.ready || loadScheduled || typeof window === "undefined") return;
  loadScheduled = true;

  const ventures = getVentures();
  ensureVandlSeeded();
  cache = {
    data: buildCeoWorkspaceDataHeuristic(ventures),
    error: null,
    ready: false,
    loading: true,
  };
  emit();

  void fetchWorkspace().then((snapshot) => {
    loadScheduled = false;
    cache = snapshot;
    emit();
  });
}

function getSnapshot(): CeoWorkspaceSnapshot {
  if (cache) return cache;
  scheduleLoad();
  return { ...EMPTY, loading: true };
}

function getServerSnapshot(): CeoWorkspaceSnapshot {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  scheduleLoad();
  return () => listeners.delete(listener);
}

export function invalidateCeoWorkspaceCache(): void {
  cache = null;
  loadScheduled = false;
  emit();
}

export function useCeoWorkspaceData(): CeoWorkspaceSnapshot & { retry: () => void } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const retry = useCallback(() => {
    invalidateCeoWorkspaceCache();
    scheduleLoad();
  }, []);

  return { ...snapshot, retry };
}
