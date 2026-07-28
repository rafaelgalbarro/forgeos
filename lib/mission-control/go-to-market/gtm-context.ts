/** Extract GTM context from mission + venture memory. */

import type { Mission } from "../types";
import type { VentureMemory } from "../pair-founder/types";
import { readVentureMemory } from "../pair-founder/venture-memory";
import type { GTMContext } from "./types";

function hashContext(parts: string[]): string {
  let h = 0;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function inferIndustry(idea: string, memory?: VentureMemory): string {
  const text = `${idea} ${memory?.ventureSummary ?? ""} ${memory?.keyFacts.join(" ") ?? ""}`.toLowerCase();
  if (/saas|software|plataforma|app/.test(text)) return "SaaS / Tecnología";
  if (/ecommerce|tienda|retail/.test(text)) return "E-commerce / Retail";
  if (/salud|health|medico/.test(text)) return "Salud / Wellness";
  if (/educacion|curso|learning/.test(text)) return "EdTech";
  if (/fintech|pago|financ/.test(text)) return "Fintech";
  return "Mercado general B2B/B2C";
}

export function buildGTMContext(mission: Mission, memory?: VentureMemory): GTMContext {
  const mem = memory ?? (typeof window !== "undefined" ? readVentureMemory(mission.id) : undefined);
  const ventureName = mission.title || mission.idea?.slice(0, 40) || "Venture";
  const idea = mission.idea ?? mem?.ventureSummary ?? ventureName;
  const intention = mission.intention ?? "VENTURE";
  const industry = inferIndustry(idea, mem);
  const contextHash = hashContext([ventureName, idea, intention, industry, mission.phase]);

  return {
    missionId: mission.id,
    ventureName,
    idea,
    intention,
    industry,
    phase: mission.phase,
    contextHash,
  };
}

export function contextChanged(prevHash: string | undefined, ctx: GTMContext): boolean {
  return !prevHash || prevHash !== ctx.contextHash;
}
