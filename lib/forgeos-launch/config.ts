/** Program 7000 — Launch config (env-driven) */

export const FORGEOS_LAUNCH_VERSION = "1.0.0";

export const FORGEOS_LAUNCH_STORAGE_KEYS = {
  newsletter: "forgeos-launch-newsletter",
  productTour: "forgeos-launch-product-tour",
  contactSubmissions: "forgeos-launch-contact",
} as const;

export function isLaunchMode(): boolean {
  if (typeof process !== "undefined" && process.env.FORGEOS_LAUNCH_MODE === "true") return true;
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_LAUNCH_MODE === "true") return true;
  return true;
}
