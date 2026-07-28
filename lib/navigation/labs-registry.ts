/** PROGRAM 4100 — Central labs index (founder-facing + engineering). */

export interface LabLink {
  label: string;
  href: string;
  desc: string;
  category?: "engineering" | "product" | "validation";
}

export const LAB_LINKS: LabLink[] = [
  { label: "RC1 Validation", href: "/lab/rc1", desc: "Checklist E2E VANDL", category: "validation" },
  { label: "Executive Runtime", href: "/lab/executive-runtime", desc: "Mission Control (ingeniería)", category: "engineering" },
  { label: "AI Collaboration", href: "/lab/ai-collaboration", desc: "Sala de colaboración ejecutiva", category: "engineering" },
  { label: "OS RC2", href: "/lab/os-rc2", desc: "Validación ForgeOS OS RC2", category: "validation" },
  { label: "AI Runtime", href: "/lab/ai-runtime", desc: "Real AI Execution Platform RC6", category: "engineering" },
  { label: "Executive Mesh", href: "/lab/executive-mesh", desc: "Executive Mesh & Skills RC4", category: "engineering" },
  { label: "Skills Framework", href: "/lab/skills", desc: "Skills Registry & Router RC4", category: "engineering" },
  { label: "Skills Governance", href: "/lab/skills-governance", desc: "Skills Safety & Governance RC4.1", category: "engineering" },
  { label: "Developer & Cloud Skills", href: "/lab/developer-skills", desc: "Developer & Cloud Skills RC4.2", category: "engineering" },
  { label: "Productivity Skills", href: "/lab/productivity-skills", desc: "Productivity Skills RC4.3", category: "engineering" },
  { label: "Business Skills", href: "/lab/business-skills", desc: "Enterprise Business Skills RC4.4", category: "engineering" },
  { label: "Marketing Skills", href: "/lab/marketing-skills", desc: "Marketing Skills RC4.5", category: "engineering" },
  { label: "Analytics Skills", href: "/lab/analytics-skills", desc: "Analytics Skills RC4.6", category: "engineering" },
  { label: "AI Capability Skills", href: "/lab/ai-skills", desc: "AI Capabilities RC4.7", category: "engineering" },
  { label: "Skill Store", href: "/lab/skill-store", desc: "Universal Skill Store RC4.8", category: "product" },
  { label: "Marketplace", href: "/marketplace", desc: "Public Skill Store browse", category: "product" },
  { label: "Official Store", href: "/store", desc: "Install & manage packs", category: "product" },
  { label: "Ecosystem Lab", href: "/lab/ecosystem", desc: "RC9 Ecosystem — CRM demo sandbox", category: "engineering" },
  { label: "Plugins", href: "/plugins", desc: "RC9 Plugin catalog (sandbox)", category: "product" },
  { label: "SDK", href: "/sdk", desc: "RC9 ForgeOS SDK developer surface", category: "product" },
  { label: "Capability Layer", href: "/lab/capabilities", desc: "Forge Capability Layer RC4.9", category: "engineering" },
  { label: "Real Connections", href: "/lab/real-connections", desc: "Real Connections RC5", category: "engineering" },
  { label: "Real Execution", href: "/lab/real-execution", desc: "Real Execution RC5.1", category: "engineering" },
  { label: "Real Build Flow", href: "/lab/real-build-flow", desc: "Real Build Flow RC5.2", category: "engineering" },
  { label: "Preview Runtime", href: "/lab/preview-runtime", desc: "PROGRAM 5370 — Sandboxed Preview Runtime", category: "engineering" },
  { label: "Build Pipeline", href: "/deployments", desc: "Dashboard pipeline unificado", category: "product" },
  { label: "Preview Deployment", href: "/lab/preview-deployment", desc: "PROGRAM 5380 — One-Click Preview Deployment", category: "engineering" },
  { label: "Live AI", href: "/lab/live-ai", desc: "Live AI Operations Center RC5.5", category: "engineering" },
  { label: "Autonomous Organization", href: "/lab/autonomous-organization", desc: "RC6.5 — Organización autónoma", category: "engineering" },
  { label: "Venture Factory", href: "/lab/venture-factory", desc: "Venture Factory RC7", category: "product" },
  { label: "Venture Intelligence", href: "/lab/venture-intelligence", desc: "Venture Intelligence RC8", category: "engineering" },
  { label: "Forge Capital", href: "/lab/forge-capital", desc: "Forge Capital RC8", category: "engineering" },
  { label: "ForgeOS Network", href: "/lab/network", desc: "Red de inteligencia colectiva RC10", category: "engineering" },
  { label: "Enterprise", href: "/lab/enterprise", desc: "ForgeOS Enterprise RC11", category: "engineering" },
  { label: "Self Evolution", href: "/lab/self-evolution", desc: "Motor de auto-evolución (dry-run)", category: "engineering" },
  { label: "Founder Zero", href: "/lab/founder-zero", desc: "First Venture Validation harness", category: "validation" },
  { label: "Command Center Lab", href: "/lab/command-center", desc: "Centro de mando harness", category: "validation" },
  { label: "Production Readiness", href: "/lab/production-readiness", desc: "Hardening 24/7 harness", category: "validation" },
  { label: "Aurea Facilities E2E", href: "/lab/aurea-facilities", desc: "Venture E2E lab harness", category: "validation" },
];
