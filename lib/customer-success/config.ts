/** Program 8000 — Customer Success Platform configuration */

import {
  isDesignPartnerAnalyticsEnabled,
  isDesignPartnerMode,
  getDesignPartnerAnalyticsEndpoint,
} from "@/lib/design-partners/config";

export function isCustomerSuccessPlatformEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_CS_PLATFORM === "true" ||
    process.env.ENABLE_CUSTOMER_SUCCESS_ANALYTICS === "true" ||
    isDesignPartnerMode()
  );
}

export function isCustomerSuccessAnalyticsEnabled(): boolean {
  return (
    process.env.ENABLE_CUSTOMER_SUCCESS_ANALYTICS === "true" ||
    process.env.NEXT_PUBLIC_CS_PLATFORM === "true" ||
    isDesignPartnerAnalyticsEnabled()
  );
}

export function getCustomerSuccessAnalyticsEndpoint(): string | undefined {
  return (
    process.env.CUSTOMER_SUCCESS_ANALYTICS_ENDPOINT?.trim() ||
    getDesignPartnerAnalyticsEndpoint()
  );
}
