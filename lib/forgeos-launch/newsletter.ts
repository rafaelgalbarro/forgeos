/** Program 7000 — Newsletter signup stub (localStorage) */

import { FORGEOS_LAUNCH_STORAGE_KEYS } from "./config";
import type { NewsletterSignupRecord } from "./types";

function readSignups(): NewsletterSignupRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FORGEOS_LAUNCH_STORAGE_KEYS.newsletter);
    if (!raw) return [];
    return JSON.parse(raw) as NewsletterSignupRecord[];
  } catch {
    return [];
  }
}

function writeSignups(records: NewsletterSignupRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORGEOS_LAUNCH_STORAGE_KEYS.newsletter, JSON.stringify(records));
}

export function subscribeNewsletter(email: string): NewsletterSignupRecord {
  const normalized = email.trim().toLowerCase();
  const existing = readSignups();
  const duplicate = existing.find((r) => r.email === normalized);
  if (duplicate) return duplicate;

  const record: NewsletterSignupRecord = {
    id: `nl-${Date.now()}`,
    email: normalized,
    createdAt: new Date().toISOString(),
  };
  writeSignups([record, ...existing]);
  return record;
}

export function listNewsletterSignups(): NewsletterSignupRecord[] {
  return readSignups();
}

export function isNewsletterSubscribed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return readSignups().some((r) => r.email === normalized);
}
