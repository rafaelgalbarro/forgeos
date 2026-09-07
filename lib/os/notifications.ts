/** ForgeOS OS — unified notification center (RC2). */

import type { OsNotification } from "./types";

const STORAGE_KEY = "forgeos-os-notifications-read";

function seedNotifications(): OsNotification[] {
  const now = new Date().toISOString();
  return [
    {
      id: "n-ceo-1",
      source: "ceo",
      title: "CEO — Briefing matutino",
      body: "El Director General ha preparado el resumen del día.",
      href: "/os/ceo",
      read: false,
      at: now,
    },
    {
      id: "n-build-1",
      source: "build",
      title: "Build finalizó",
      body: "Frontend factory completó el último artefacto VANDL.",
      href: "/os/build",
      read: false,
      at: now,
    },
    {
      id: "n-research-1",
      source: "research",
      title: "Research terminó",
      body: "Análisis de mercado actualizado para VANDL.",
      href: "/os/workspace/demo-venture-vandl",
      read: false,
      at: now,
    },
    {
      id: "n-board-1",
      source: "board",
      title: "Board recomienda",
      body: "Priorizar validación con 3 clientes esta semana.",
      href: "/os/ceo",
      read: true,
      at: now,
    },
    {
      id: "n-capital-1",
      source: "capital",
      title: "Capital — Runway",
      body: "Runway estimado: 14 meses al ritmo actual.",
      href: "/os/capital",
      read: true,
      at: now,
    },
    {
      id: "n-deploy-1",
      source: "deployment",
      title: "Deployment listo",
      body: "Preview environment disponible para revisión.",
      href: "/os/build",
      read: false,
      at: now,
    },
  ];
}

function readReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeReadIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function getOsNotifications(): OsNotification[] {
  const readIds = readReadIds();
  return seedNotifications().map((n) => ({ ...n, read: readIds.has(n.id) || n.read }));
}

export function getUnreadNotificationCount(): number {
  return getOsNotifications().filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  const ids = readReadIds();
  ids.add(id);
  writeReadIds(ids);
}

export function markAllNotificationsRead(): void {
  const ids = new Set(getOsNotifications().map((n) => n.id));
  writeReadIds(ids);
}

export const NOTIFICATION_SOURCE_LABELS: Record<OsNotification["source"], string> = {
  ceo: "CEO",
  build: "Build",
  research: "Research",
  workers: "Workers",
  board: "Board",
  capital: "Capital",
  deployment: "Deployment",
  investment: "Investment",
};
