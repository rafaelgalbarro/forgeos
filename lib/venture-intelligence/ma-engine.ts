/** RC8 — M&A engine (heuristic, dry-run). */

import type { MaScenarioResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";

const SECTOR_ACQUIRERS: Record<string, string[]> = {
  saas: ["Salesforce", "HubSpot", "Microsoft", "SAP"],
  logistics: ["DHL", "Maersk", "FedEx", "Uber Freight"],
  default: ["Strategic Corp A", "PE Roll-up", "Competidor regional"],
};

export function analyzeMaPotential(inputs: VentureFinancialInputs): MaScenarioResult {
  const growthSignal = inputs.mrrGrowthRatePct > 12 ? 20 : 10;
  const revenueSignal = inputs.monthlyRevenue > 20_000 ? 15 : 5;
  const teamSignal = inputs.teamSize >= 8 ? 10 : 5;
  const attractivenessScore = Math.min(40 + growthSignal + revenueSignal + teamSignal, 95);

  const potentialAcquirers = SECTOR_ACQUIRERS.logistics ?? SECTOR_ACQUIRERS.default;

  return {
    attractivenessScore,
    potentialAcquirers,
    synergyAreas: [
      "Integración de flota y telematics",
      "Base de clientes B2B",
      "Datos operativos y ESG",
      "Expansión geográfica",
    ],
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
