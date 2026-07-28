import type { AnalyticsEvent, AnalyticsPayload } from "./types";

const PREFIX = "[ForgeOS Analytics]";

/** Placeholder analytics — console only, no external SDK */
export function trackEvent(payload: AnalyticsPayload): void {
  if (typeof window !== "undefined") {
    console.log(PREFIX, payload.event, payload);
  }
}

export function trackPageView(path: string): void {
  trackEvent({ event: "page_view", path });
}

export function trackBetaSignup(email: string): void {
  trackEvent({
    event: "beta_signup",
    meta: { emailDomain: email.split("@")[1] ?? "unknown" },
  });
}

export function trackOnboardingStart(): void {
  trackEvent({ event: "onboarding_start" });
}

export function trackOnboardingStep(step: AnalyticsPayload["step"]): void {
  trackEvent({ event: "onboarding_step", step });
}

export function trackOnboardingComplete(venturePath: string): void {
  trackEvent({
    event: "onboarding_complete",
    meta: { venturePath },
  });
}

export function trackCtaClick(label: string, path?: string): void {
  trackEvent({ event: "cta_click", label, path });
}

export function trackFeedbackSubmit(category: string): void {
  trackEvent({ event: "feedback_submit", meta: { category } });
}

export function trackPricingView(): void {
  trackEvent({ event: "pricing_view" });
}

export function useAnalyticsPageView(path: string): void {
  if (typeof window !== "undefined") {
    trackPageView(path);
  }
}

export function createAnalyticsHook(event: AnalyticsEvent) {
  return (meta?: Record<string, string>) => {
    trackEvent({ event, meta });
  };
}
