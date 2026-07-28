/** Program 6000 — Public API surface types */

import type { CommercialPlanId, CommercialSubscription, UsageCounter } from "./types";

export interface PublicApiPlan {
  id: CommercialPlanId;
  name: string;
  monthlyPrice: number;
  currency: string;
  features: string[];
}

export interface PublicApiSubscription {
  planId: CommercialPlanId;
  status: CommercialSubscription["status"];
  seats: number;
  seatsUsed: number;
  renewsAt: string;
}

export interface PublicApiUsage {
  metrics: UsageCounter[];
}

export interface PublicApiError {
  code: string;
  message: string;
}

export type PublicApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: PublicApiError };

export const PUBLIC_API_VERSION = "v1";

export const PUBLIC_API_ENDPOINTS = {
  plans: "/api/v1/commercial/plans",
  subscription: "/api/v1/commercial/subscription",
  usage: "/api/v1/commercial/usage",
  invoices: "/api/v1/commercial/invoices",
  apiKeys: "/api/v1/commercial/api-keys",
} as const;
