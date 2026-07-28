/** Program 5000 — Design Partner Program configuration */

export function isDesignPartnerMode(): boolean {
  return (
    process.env.DESIGN_PARTNER_MODE === "true" ||
    process.env.NEXT_PUBLIC_DESIGN_PARTNER_MODE === "true"
  );
}

export function isDesignPartnerAnalyticsEnabled(): boolean {
  return (
    process.env.ENABLE_DESIGN_PARTNER_ANALYTICS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_DESIGN_PARTNER_ANALYTICS === "true" ||
    process.env.ENABLE_BETA_ANALYTICS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_BETA_ANALYTICS === "true"
  );
}

export function getDesignPartnerAnalyticsEndpoint(): string | undefined {
  return (
    process.env.DESIGN_PARTNER_ANALYTICS_ENDPOINT?.trim() ||
    process.env.BETA_ANALYTICS_ENDPOINT?.trim() ||
    undefined
  );
}
