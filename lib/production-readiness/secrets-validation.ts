/** Program 6500 — Validate env secrets presence (no values exposed) */

import { REQUIRED_SECRETS } from "./config";
import type { SecretValidationResult } from "./types";

export function validateSecrets(): SecretValidationResult[] {
  if (typeof process === "undefined") {
    return REQUIRED_SECRETS.map((s) => ({
      key: s.key,
      present: false,
      required: s.required,
      category: s.category,
    }));
  }

  return REQUIRED_SECRETS.map((s) => {
    const value = process.env[s.key];
    return {
      key: s.key,
      present: Boolean(value && value.trim().length > 0),
      required: s.required,
      category: s.category,
    };
  });
}

export function secretsSummary(): { present: number; total: number; missingRequired: string[] } {
  const results = validateSecrets();
  return {
    present: results.filter((r) => r.present).length,
    total: results.length,
    missingRequired: results.filter((r) => r.required && !r.present).map((r) => r.key),
  };
}
