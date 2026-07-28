/** Program 7000 — Contact form stub */

import { FORGEOS_LAUNCH_STORAGE_KEYS } from "./config";
import type { ContactFormPayload } from "./types";

export interface ContactSubmission extends ContactFormPayload {
  id: string;
  createdAt: string;
}

function readSubmissions(): ContactSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FORGEOS_LAUNCH_STORAGE_KEYS.contactSubmissions);
    if (!raw) return [];
    return JSON.parse(raw) as ContactSubmission[];
  } catch {
    return [];
  }
}

function writeSubmissions(records: ContactSubmission[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORGEOS_LAUNCH_STORAGE_KEYS.contactSubmissions, JSON.stringify(records));
}

export function submitContactForm(payload: ContactFormPayload): ContactSubmission {
  const record: ContactSubmission = {
    ...payload,
    id: `contact-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeSubmissions([record, ...readSubmissions()]);
  return record;
}

export function listContactSubmissions(): ContactSubmission[] {
  return readSubmissions();
}

export const CONTACT_CHANNELS = [
  { id: "sales", label: "Ventas Enterprise", href: "mailto:enterprise@forgeos.io" },
  { id: "support", label: "Soporte", href: "/support" },
  { id: "partners", label: "Partners", href: "mailto:partners@forgeos.io" },
] as const;
