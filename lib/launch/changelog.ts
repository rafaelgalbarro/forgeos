import type { ChangelogEntry } from "./types";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-07-08",
    title: "ForgeOS 1.0 — Lanzamiento oficial",
    tag: "major",
    highlights: [
      "Launch Hub central en /launch con superficies públicas",
      "Demo interactiva, tour de producto y casos de éxito",
      "Comunidad, newsletter, API docs y legal hub",
      "Pricing final Starter/Pro/Business/Enterprise (Program 6000)",
    ],
  },
  {
    version: "1.0.0-rc12",
    date: "2026-07-07",
    title: "ForgeOS 1.0 Launch Preparation",
    tag: "major",
    highlights: [
      "Landing oficial, pricing y flujo de beta privada",
      "Onboarding wizard multi-paso",
      "Docs hub, status page y centro de soporte",
      "Feedback widget y roadmap público",
    ],
  },
  {
    version: "0.11.0",
    date: "2026-06-15",
    title: "Autonomous Organization & Ecosystem",
    tag: "minor",
    highlights: [
      "Departamentos autónomos con KPIs ejecutivos",
      "Marketplace y store engine",
      "Venture intelligence scoring",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-05-20",
    title: "Venture Factory Pipeline",
    tag: "minor",
    highlights: [
      "Pipeline completo idea → launch",
      "Brand, landing y revenue engines",
      "Forge Capital lab integration",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-04-10",
    title: "Live AI Operations",
    tag: "minor",
    highlights: [
      "Live operations center",
      "AI runtime v2 con model router",
      "Executive mesh collaboration",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-01",
    title: "Founder Experience",
    tag: "patch",
    highlights: [
      "Founder dashboard y creator flow",
      "Discovery engine mejorado",
      "Portfolio analytics",
    ],
  },
];

export function getLatestChangelog(): ChangelogEntry {
  return CHANGELOG[0];
}
