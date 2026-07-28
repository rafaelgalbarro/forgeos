/** GTM orchestrator — generate full GTMPackage from mission context. */

import type { Mission } from "../types";
import type {
  GTMDeliverableId,
  GTMGenerationResult,
  GTMPackage,
  GTMDeliverableStatus,
} from "./types";
import { GTM_DELIVERABLE_LABELS } from "./types";
import { buildGTMContext, contextChanged } from "./gtm-context";
import { generateLaunchPlan } from "./launch-plan-generator";
import { generateContentCalendar } from "./content-calendar-generator";
import { generateLinkedInPlan } from "./linkedin-plan-generator";
import { generateEmailCampaigns } from "./email-campaigns-generator";
import { generateProductHuntChecklist } from "./product-hunt-checklist";
import { generatePressKit } from "./press-kit-generator";
import { generateWebsiteReview } from "./website-review-generator";
import { generateOnboardingChecklist } from "./onboarding-checklist-generator";
import { buildGTMSnapshotFromPackage } from "./gtm-snapshots";
import { readGTMPackage, writeGTMPackage } from "./gtm-persistence";

const GTM_INTENT_PATTERN =
  /\b(lanzar|lanzamiento|go\s*to\s*market|gtm|salir\s*al\s*mercado|launch\s*plan|product\s*hunt)\b/i;

export function detectGTMIntent(input: string): boolean {
  return GTM_INTENT_PATTERN.test(input.trim());
}

export function shouldAutoTriggerGTM(phase: Mission["phase"]): boolean {
  return phase === "VALIDATE" || phase === "DEPLOY" || phase === "OPERATE";
}

export function gtmPhaseLabel(): string {
  return "Go To Market";
}

export function shouldRegenerateGTM(mission: Mission): boolean {
  const existing = readGTMPackage(mission.id);
  if (!existing) return true;
  const ctx = buildGTMContext(mission);
  return contextChanged(existing.contextHash, ctx);
}

function allReady(): Record<GTMDeliverableId, GTMDeliverableStatus> {
  return {
    launchPlan: "ready",
    contentCalendar: "ready",
    linkedInPlan: "ready",
    emailCampaigns: "ready",
    productHunt: "ready",
    pressKit: "ready",
    websiteReview: "ready",
    onboardingChecklist: "ready",
  };
}

export function generateGTMPackage(mission: Mission, force = false): GTMGenerationResult {
  const ctx = buildGTMContext(mission);

  if (!force) {
    const cached = readGTMPackage(mission.id);
    if (cached && !contextChanged(cached.contextHash, ctx)) {
      return {
        package: cached,
        snapshot: buildGTMSnapshotFromPackage(cached),
        events: [],
      };
    }
  }

  const events: GTMGenerationResult["events"] = [];
  const deliverableIds: GTMDeliverableId[] = [
    "launchPlan",
    "contentCalendar",
    "linkedInPlan",
    "emailCampaigns",
    "productHunt",
    "pressKit",
    "websiteReview",
    "onboardingChecklist",
  ];

  for (const id of deliverableIds) {
    events.push({ deliverableId: id, label: `${GTM_DELIVERABLE_LABELS[id]} generado` });
  }

  const pkg: GTMPackage = {
    missionId: mission.id,
    generatedAt: new Date().toISOString(),
    contextHash: ctx.contextHash,
    ventureName: ctx.ventureName,
    launchPlan: generateLaunchPlan(ctx),
    contentCalendar: generateContentCalendar(ctx),
    linkedInPlan: generateLinkedInPlan(ctx),
    emailCampaigns: generateEmailCampaigns(ctx),
    productHuntChecklist: generateProductHuntChecklist(ctx),
    pressKit: generatePressKit(ctx),
    websiteReview: generateWebsiteReview(ctx),
    onboardingChecklist: generateOnboardingChecklist(ctx),
    deliverableStatus: allReady(),
  };

  writeGTMPackage(pkg);

  return {
    package: pkg,
    snapshot: buildGTMSnapshotFromPackage(pkg),
    events,
  };
}

/** Async wrapper for conversation engine — yields to event loop between deliverables. */
export async function generateGTMPackageAsync(
  mission: Mission,
  force = false,
  onDeliverable?: (label: string) => void
): Promise<GTMGenerationResult> {
  if (!force && !shouldRegenerateGTM(mission)) {
    const cached = readGTMPackage(mission.id);
    if (cached) {
      return {
        package: cached,
        snapshot: buildGTMSnapshotFromPackage(cached),
        events: [],
      };
    }
  }

  const result = generateGTMPackage(mission, force);
  for (const ev of result.events) {
    onDeliverable?.(ev.label);
    await new Promise((r) => setTimeout(r, 0));
  }
  return result;
}

export function attachGTMSnapshotToMission(mission: Mission, snapshot: ReturnType<typeof buildGTMSnapshotFromPackage>): Mission {
  return {
    ...mission,
    gtmSnapshot: snapshot,
    updatedAt: new Date().toISOString(),
  };
}
