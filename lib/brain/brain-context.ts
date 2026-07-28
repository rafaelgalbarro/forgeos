import {
  BRAIN_DECISION_SYSTEM,
  BRAIN_DISCOVERY,
  BRAIN_FOUNDER_ADVISOR,
  BRAIN_PRINCIPLES,
  BRAIN_PRODUCT,
  BRAIN_QUALITY_RULES,
  BRAIN_RESEARCH,
  BRAIN_SCORES,
  BRAIN_VENTURE_SIMULATOR,
  BRAIN_VERSION,
} from "./brain-loader";
import type { BrainWorkerId } from "./brain-types";

const WORKER_SECTIONS: Record<BrainWorkerId, string[]> = {
  research: [
    BRAIN_PRINCIPLES,
    BRAIN_DISCOVERY,
    BRAIN_RESEARCH,
    BRAIN_QUALITY_RULES,
    BRAIN_SCORES,
  ],
  product: [
    BRAIN_PRINCIPLES,
    BRAIN_DISCOVERY,
    BRAIN_PRODUCT,
    BRAIN_QUALITY_RULES,
    BRAIN_VENTURE_SIMULATOR,
  ],
  founder: [
    BRAIN_PRINCIPLES,
    BRAIN_FOUNDER_ADVISOR,
    BRAIN_DISCOVERY,
    BRAIN_DECISION_SYSTEM,
  ],
  ceo: [
    BRAIN_PRINCIPLES,
    BRAIN_DECISION_SYSTEM,
    BRAIN_SCORES,
    BRAIN_VENTURE_SIMULATOR,
    BRAIN_QUALITY_RULES,
  ],
};

export function getBrainContextForWorker(workerId: BrainWorkerId): string {
  const sections = WORKER_SECTIONS[workerId] ?? [BRAIN_PRINCIPLES];
  return `FORGEOS BRAIN CONTEXT v${BRAIN_VERSION}
Brain Context define cómo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.

${sections.join("\n\n")}`;
}

export function formatBrainContextForPrompt(workerId: BrainWorkerId): string {
  const context = getBrainContextForWorker(workerId);
  return context.trim().length > 0 ? context : "";
}
