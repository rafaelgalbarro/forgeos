/** ForgeOS RC6.5 — active initiatives engine. */

import type { ActiveInitiative } from "./types";

const INITIATIVES: ActiveInitiative[] = [
  {
    id: "init-rc7",
    title: "RC7 — Autonomous Build Pipeline",
    departmentIds: ["build", "architecture", "qa"],
    status: "active",
    progress: 42,
    owner: "Build",
  },
  {
    id: "init-founder-beta",
    title: "Founder Beta — onboarding autónomo",
    departmentIds: ["product", "growth", "marketing"],
    status: "active",
    progress: 65,
    owner: "Product",
  },
  {
    id: "init-mesh-v2",
    title: "Executive Mesh v2 — coordinación cross-dept",
    departmentIds: ["ceo", "architecture", "research"],
    status: "planned",
    progress: 15,
    owner: "CEO",
  },
];

export function getActiveInitiatives(): ActiveInitiative[] {
  return INITIATIVES.filter((i) => i.status === "active" || i.status === "planned");
}
