import type { ResearchEngine } from "./engines/contract";
import { newsEngine } from "./engines/news";
import { macroEngine } from "./engines/macro";
import { companyEngine } from "./engines/company";
import { technicalEngine } from "./engines/technical";
import { quantEngine } from "./engines/quant";
import { sentimentEngine } from "./engines/sentiment";
import { eventsEngine } from "./engines/events";
import { patternEngine } from "./engines/pattern";
import { aiResearcherEngine } from "./engines/ai-researcher";
import type { ResearchEngineId, ResearchEngineRegistryRow } from "./types";
import type { ResearchEngineContext } from "./engines/contract";

const ENGINES: readonly ResearchEngine[] = [
  newsEngine,
  macroEngine,
  companyEngine,
  technicalEngine,
  quantEngine,
  sentimentEngine,
  eventsEngine,
  patternEngine,
  aiResearcherEngine,
];

export function listResearchEngines(): readonly ResearchEngine[] {
  return ENGINES;
}

export function getResearchEngine(id: ResearchEngineId): ResearchEngine | undefined {
  return ENGINES.find((e) => e.id === id);
}

/** Peer engines run before AI researcher composition. */
export function listPeerResearchEngines(): readonly ResearchEngine[] {
  return ENGINES.filter((e) => e.id !== "ai-researcher");
}

export function buildEngineRegistryRows(
  ctx: ResearchEngineContext,
): readonly ResearchEngineRegistryRow[] {
  return ENGINES.map((e) => ({
    id: e.id,
    title: e.title,
    wiring: e.resolveWiring(ctx),
    description: e.description,
    providers:
      e.id === "news"
        ? ctx.newsProviders
        : e.id === "macro" || e.id === "events"
          ? [...ctx.economicProviders, ...(e.id === "events" ? ctx.newsProviders : [])]
          : e.id === "sentiment"
            ? ctx.sentimentProviders
            : e.id === "pattern"
              ? []
              : ctx.marketProviders,
  }));
}
