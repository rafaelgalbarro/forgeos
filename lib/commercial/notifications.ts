/** Program 6000 — Billing notifications */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import type { BillingNotification } from "./types";

function uid(): string {
  return `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readNotifications(): BillingNotification[] {
  return readStorage<BillingNotification[]>(COMMERCIAL_STORAGE_KEYS.notifications, []);
}

function writeNotifications(notifications: BillingNotification[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.notifications, notifications);
}

export function listBillingNotifications(orgId?: string): BillingNotification[] {
  const all = readNotifications();
  if (!orgId) return all;
  return all.filter((n) => n.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pushBillingNotification(
  input: Omit<BillingNotification, "id" | "read" | "createdAt">
): BillingNotification {
  const notification: BillingNotification = {
    ...input,
    id: uid(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  writeNotifications([...readNotifications(), notification]);
  return notification;
}

export function markNotificationRead(id: string): void {
  writeNotifications(
    readNotifications().map((n) => (n.id === id ? { ...n, read: true } : n))
  );
}

export function unreadNotificationCount(orgId: string): number {
  return listBillingNotifications(orgId).filter((n) => !n.read).length;
}
