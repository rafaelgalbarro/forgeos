import type { CustomerHealthScore } from "./types";
import {
  computeCustomerHealth,
  listCustomerHealthScores,
  getCustomerHealth,
} from "@/lib/design-partners/customer-health";

export { computeCustomerHealth, listCustomerHealthScores, getCustomerHealth };

export function getHealthTierLabel(tier: CustomerHealthScore["tier"]): string {
  const labels: Record<CustomerHealthScore["tier"], string> = {
    "at-risk": "En riesgo",
    neutral: "Neutral",
    healthy: "Saludable",
    champion: "Campeón",
  };
  return labels[tier];
}
