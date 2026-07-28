/** RC1 integration route map — cross-links between Founder Experience modules. */

import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";

export interface Rc1NavLink {
  label: string;
  href: string;
  description: string;
  group: "founder" | "venture" | "runtime" | "build" | "lab";
}

export const RC1_NAV_LINKS: Rc1NavLink[] = [
  { label: "Founder", href: "/founder", description: "Punto de entrada del fundador", group: "founder" },
  { label: "Creator", href: "/creator", description: "Flujo de creación VANDL", group: "founder" },
  { label: "CEO Workspace", href: "/ceo", description: "Vista ejecutiva del portfolio", group: "founder" },
  { label: "Founder Journey", href: "/founder-journey", description: "15 fases del recorrido", group: "founder" },
  {
    label: "Venture Workspace",
    href: `/venture/${VANDL_VENTURE_ID}`,
    description: "Workspace VANDL",
    group: "venture",
  },
  {
    label: "Timeline",
    href: `/venture/${VANDL_VENTURE_ID}/timeline`,
    description: "Timeline del venture",
    group: "venture",
  },
  {
    label: "Knowledge",
    href: `/venture/${VANDL_VENTURE_ID}/knowledge`,
    description: "Knowledge hub del venture",
    group: "venture",
  },
  { label: "Executive Runtime", href: "/lab/executive-runtime", description: "Mission Control", group: "runtime" },
  { label: "Build Context", href: "/lab/build-context", description: "Build Context lab", group: "build" },
  { label: "Build DNA", href: "/lab/build-dna", description: "Build DNA lab", group: "build" },
  { label: "Release Manager", href: "/lab/release-manager", description: "Release package lab", group: "build" },
  { label: "RC1 Validation", href: "/lab/rc1", description: "E2E VANDL checklist", group: "lab" },
];

export function getRc1LinksByGroup(group: Rc1NavLink["group"]): Rc1NavLink[] {
  return RC1_NAV_LINKS.filter((l) => l.group === group);
}
