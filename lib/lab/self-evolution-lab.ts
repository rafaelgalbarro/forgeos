/** Program 2035 — Self Evolution lab harness. */

import { runSelfEvolutionLab } from "@/lib/self-evolution";

export type SelfEvolutionLabSnapshot = ReturnType<typeof runSelfEvolutionLab>;

export function runSelfEvolutionLabHarness(): SelfEvolutionLabSnapshot {
  return runSelfEvolutionLab();
}

export function seedSelfEvolutionLab(): SelfEvolutionLabSnapshot {
  return runSelfEvolutionLab();
}
