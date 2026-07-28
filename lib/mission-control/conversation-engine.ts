/** Main conversation engine — one decision per response, brief Spanish tone. */

import type { ConversationTurnResult, IntentionType, Mission, MissionMessage } from "./types";
import type { ProactiveCEOState } from "./digital-ceo/types";
import { startMissionSession } from "./digital-ceo/proactive-init";
import { classifyFromCard, classifyUserInput, ceoClarifyingVoice, classifyMissionIntent, formatCeoIntentionExplanation } from "./intention-engine";
import { setIntention, advancePhase, updateCeoStatus, snapshotsForIntention } from "./mission-flow";
import {
  getNextDiscoveryQuestion,
  recordDiscoveryAnswer,
  isDiscoveryComplete,
  generateOpportunities,
  formatOpportunityList,
} from "./discovery-mode";
import { routeToFactory } from "./smart-routing";
import { startLiveExecution, advanceExecutionStep } from "./live-execution";
import {
  appendTimelineEvent,
  timelineForIdeaRegistered,
  timelineForPhaseAdvance,
  timelineForDiscovery,
  timelineForUserMessage,
  timelineForCeoResponse,
  timelineForDeployStub,
} from "./mission-timeline";
import { emitMissionEventAsync, emitGTMDeliverable, emitGTMPlanReady } from "./live-mission/event-emitter";
import {
  getNextPendingDecision,
  getPendingDecisions,
  resolveDecision,
  seedDecisionsForIntention,
  formatDecisionPrompt,
} from "./decision-center";
import { autoResolveIfAllowed, shouldPauseForDecision } from "./auto-pilot";
import {
  formatApprovalQuestion,
  handleApprovalResponse,
} from "./autonomous-build/mission-approval";
import { attachAutonomousState } from "./autonomous-build/autonomous-orchestrator";
import { isApprovalDecision } from "./decision-center";
import {
  shouldShowExecutiveCouncil,
  runExecutiveBoardForMission,
  injectExecutiveSummaryIntoReply,
} from "./executive-orchestration";
import { runPairFounderTurn, isExplicitReviewRequest } from "@/lib/pair-founder";
import {
  detectExitStrategyFromText,
  parseExitStrategyChoice,
  EXIT_STRATEGY_CLARIFYING_QUESTION,
} from "./exit-strategy/exit-strategy-selector";
import { orchestrateExitStrategyChange, shouldShowExitStrategy, detectExitStrategyIntent } from "./exit-strategy/exit-orchestrator";
import type { ExitStrategyType } from "./exit-strategy/types";
import {
  detectGTMIntent,
  generateGTMPackage,
  generateGTMPackageAsync,
  attachGTMSnapshotToMission,
  shouldRegenerateGTM,
  shouldAutoTriggerGTM,
} from "./go-to-market";
import { detectInvestorIntent, generateInvestorPackage, investorIntentReply, updateMissionInvestorSnapshot } from "./investor-mode";

async function applyExecutiveBoardIfNeeded(
  result: ConversationTurnResult,
  userInput?: string
): Promise<ConversationTurnResult> {
  if (!shouldShowExecutiveCouncil(result.mission, userInput)) {
    return result;
  }

  const board = await runExecutiveBoardForMission(result.mission, userInput);
  let reply = result.reply;
  if (board.ceoInjection) {
    reply = injectExecutiveSummaryIntoReply(result.reply, board.ceoInjection);
    const messages = [...board.mission.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ceo") {
        messages[i] = { ...messages[i], content: reply };
        break;
      }
    }
    return {
      ...result,
      mission: { ...board.mission, messages },
      reply,
      showExecutiveBanner: true,
      executiveBoardReviewing: board.mission.executiveBoard?.status === "reviewing",
      executiveBoardSession: board.mission.executiveBoard,
    };
  }

  return {
    ...result,
    mission: board.mission,
    showExecutiveBanner: true,
    executiveBoardSession: board.mission.executiveBoard,
  };
}

async function applyInvestorModeAsync(mission: Mission): Promise<{ mission: Mission; score: number }> {
  const pkg = await generateInvestorPackage(mission);
  let m = updateMissionInvestorSnapshot(mission, pkg.readiness.score);
  m = emitMissionEventAsync(m, "execution", "Investor Deck generado", { department: "CFO", icon: "📊" });
  m = emitMissionEventAsync(m, "execution", `Readiness Score: ${pkg.readiness.score}%`, { department: "CFO", icon: "💰" });
  m = appendTimelineEvent(m, `Investor Mode: ${pkg.readiness.score}% readiness`, m.phase, "💰");
  m = {
    ...m,
    investorSnapshot: {
      version: pkg.version,
      generatedAt: pkg.generatedAt,
      readinessScore: pkg.readiness.score,
      readinessLabel: pkg.readiness.score >= 80 ? "Listo para inversores" : pkg.readiness.score >= 60 ? "Casi listo" : "En preparación",
      deliverableCount: 8,
      gaps: pkg.readiness.gaps,
    },
  };
  return { mission: m, score: pkg.readiness.score };
}

function shouldAutoTriggerInvestor(phase: Mission["phase"]): boolean {
  return phase === "VALIDATE" || phase === "OPERATE";
}

async function finalizeWithPairFounder(
  result: ConversationTurnResult,
  userInput?: string,
  trigger: "user_message" | "decision_resolved" | "context_change" | "explicit_review" = "user_message"
): Promise<ConversationTurnResult> {
  const effectiveTrigger =
    userInput && isExplicitReviewRequest(userInput) ? "explicit_review" : trigger;
  const pf = await runPairFounderTurn(result.mission, result.reply, userInput, effectiveTrigger);
  let reply = appendCeoDecisionHint(pf.mission, pf.reply);
  const messages = [...pf.mission.messages];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "ceo") {
      messages[i] = { ...messages[i], content: reply };
      break;
    }
  }
  const mission = { ...pf.mission, messages, ceoInsight: pf.insight };
  const withBoard = await applyExecutiveBoardIfNeeded({ ...result, mission, reply }, userInput);
  return withBoard;
}

/** PROGRAM 6000 — proactive CEO on session start. */
export function initializeMissionSession(mission: Mission): {
  mission: Mission;
  proactiveState: ProactiveCEOState;
} {
  const { mission: updated, state } = startMissionSession(mission);
  return { mission: updated, proactiveState: state };
}

function appendCeoDecisionHint(mission: Mission, reply: string): string {
  const pending = getPendingDecisions(mission);
  if (pending.length === 0) return reply;
  if (reply.includes(pending[0].title)) return reply;
  const hint = `\n\n📋 Decisión pendiente: ${formatDecisionPrompt(pending[0])}`;
  return `${reply}${hint}`;
}

function msgId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function addMessage(mission: Mission, role: MissionMessage["role"], content: string, decisionPrompt = false): Mission {
  const message: MissionMessage = {
    id: msgId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    decisionPrompt,
  };
  let m: Mission = { ...mission, messages: [...mission.messages, message] };
  if (role === "user") m = timelineForUserMessage(m, content);
  else if (role === "ceo") m = timelineForCeoResponse(m, content);
  return m;
}

function updateSnapshotProgress(mission: Mission, domain: string, progress: number): Mission {
  const snapshots = mission.snapshots.map((s) =>
    s.id === domain
      ? {
          ...s,
          progress,
          status: progress >= 100 ? ("completed" as const) : ("in_progress" as const),
        }
      : s
  );
  return { ...mission, snapshots };
}

function applyGTMToMission(mission: Mission, force = false): Mission {
  if (!mission.intention || mission.intention === "DISCOVERY") return mission;
  if (!force && !shouldAutoTriggerGTM(mission.phase) && !mission.gtmSnapshot?.generatedAt) return mission;
  if (!force && mission.gtmSnapshot?.generatedAt && !shouldRegenerateGTM(mission)) return mission;

  let m = mission;
  const result = generateGTMPackage(m, force);
  m = attachGTMSnapshotToMission(m, result.snapshot);
  for (const ev of result.events) {
    m = emitGTMDeliverable(m, ev.label);
  }
  if (result.events.length) {
    m = emitGTMPlanReady(m);
    m = appendTimelineEvent(m, "Plan de lanzamiento GTM generado", m.phase, "🚀");
    m = updateSnapshotProgress(m, "gtm", 100);
    m = updateCeoStatus(m, {
      recommendations: ["Revisa el panel Lanzamiento con los 8 entregables GTM"],
    });
  }
  return m;
}

async function applyGTMAsync(mission: Mission, force = false): Promise<Mission> {
  if (!mission.intention || mission.intention === "DISCOVERY") return mission;
  let m: Mission = { ...mission, gtmGenerating: true };
  const result = await generateGTMPackageAsync(m, force, (label) => {
    m = { ...emitGTMDeliverable(m, label), gtmGenerating: true };
  });
  m = attachGTMSnapshotToMission(m, result.snapshot);
  if (result.events.length) {
    m = emitGTMPlanReady(m);
    m = appendTimelineEvent(m, "Plan de lanzamiento GTM generado", m.phase, "🚀");
    m = updateSnapshotProgress(m, "gtm", 100);
    m = updateCeoStatus(m, {
      recommendations: ["Revisa el panel Lanzamiento con los 8 entregables GTM"],
    });
  }
  return { ...m, gtmGenerating: false };
}

export function handleCardSelection(mission: Mission, cardId: string, idea?: string): ConversationTurnResult {
  const result = classifyFromCard(cardId, idea);
  if (!result.intention) {
    const reply = ceoClarifyingVoice(result.clarifyingQuestion!);
    let m = addMessage(mission, "ceo", reply, true);
    return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
  }
  return handleIntentionSet(mission, result.intention, result.extractedIdea || idea || "");
}

function handleExitStrategyInput(mission: Mission, trimmed: string): ConversationTurnResult | null {
  if (!shouldShowExitStrategy(mission)) return null;

  const parsed = parseExitStrategyChoice(trimmed);
  if (parsed) {
    let m = addMessage(mission, "user", trimmed);
    const result = orchestrateExitStrategyChange(m, parsed);
    m = result.mission;
    const deltaNote = result.delta
      ? `\n\nQué ha cambiado: ${result.delta.summary}`
      : "";
    const reply = `${result.reply ?? ""}${deltaNote}`;
    m = addMessage(m, "ceo", reply);
    m = appendTimelineEvent(m, `Exit strategy: ${parsed}`, m.phase, "🎯");
    return { mission: m, reply, awaitingInput: false, showExecutiveBanner: false };
  }

  if (detectExitStrategyIntent(trimmed)) {
    const detected = detectExitStrategyFromText(trimmed);
    let m = addMessage(mission, "user", trimmed);
    if (detected === "ambiguous" || detected === null) {
      const reply = EXIT_STRATEGY_CLARIFYING_QUESTION;
      m = addMessage(m, "ceo", reply, true);
      return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
    }
    const result = orchestrateExitStrategyChange(m, detected);
    m = result.mission;
    const reply = result.reply ?? `Estrategia definida: ${detected}`;
    m = addMessage(m, "ceo", reply);
    return { mission: m, reply, awaitingInput: false, showExecutiveBanner: false };
  }

  return null;
}

export function handleUserMessage(mission: Mission, input: string): ConversationTurnResult | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      mission,
      reply: "Escribe tu idea o elige una tarjeta para empezar.",
      awaitingInput: true,
      showExecutiveBanner: false,
    };
  }

  // PROGRAM 5500 — resolve autonomous approval gate (sí/no)
  if (mission.autonomous?.pendingApproval && !mission.autonomous.pendingApproval.resolved) {
    const approved = /^(s[ií]|yes|autorizo|confirmo|ok|1)/i.test(trimmed);
    const rejected = /^(no|cancelar|rechazo|2)/i.test(trimmed);
    if (approved || rejected) {
      const { mission: updated, state } = handleApprovalResponse(mission, mission.autonomous, approved);
      let m = attachAutonomousState(updated, state);
      m = addMessage(m, "user", trimmed);
      const gate = mission.autonomous.pendingApproval;
      m = resolveDecision(m, gate.id, approved ? "Sí, autorizo" : "No, cancelar");
      m = appendTimelineEvent(m, `Aprobación: ${gate.title} → ${approved ? "Sí" : "No"}`, m.phase, approved ? "✅" : "⛔");
      const reply = approved
        ? "Perfecto. Continúo automáticamente."
        : "Entendido. Pauso hasta nueva instrucción.";
      m = addMessage(m, "ceo", reply);
      return { mission: m, reply, awaitingInput: false, showExecutiveBanner: false };
    }
  }

  // Resolve pending decision by number or text match
  const pending = getNextPendingDecision(mission);
  if (pending) {
    const num = parseInt(trimmed, 10);
    const option =
      !isNaN(num) && num >= 1 && num <= pending.options.length
        ? pending.options[num - 1]
        : pending.options.find((o) => o.toLowerCase().includes(trimmed.toLowerCase()));
    if (option) {
      let m = resolveDecision(mission, pending.id, option);
      m = appendTimelineEvent(m, `Decisión tomada: ${pending.title} → ${option}`, m.phase, "✅");
      m = autoResolveIfAllowed(m);
      return continueMissionFlow(m);
    }
  }

  // Discovery flow answers
  if (mission.intention === "DISCOVERY") {
    const q = getNextDiscoveryQuestion(mission);
    if (q) {
      let m = recordDiscoveryAnswer(mission, q.field, trimmed);
      m = timelineForDiscovery(m, `Perfil: ${q.field}`);
      m = addMessage(m, "user", trimmed);
      return continueDiscoveryFlow(m);
    }
    // Opportunity selection
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 3) {
      const opps = generateOpportunities(mission);
      const selected = opps[num - 1];
      let m = setIntention(mission, "VENTURE", selected.title);
      m = timelineForDiscovery(m, `Oportunidad elegida: ${selected.title}`);
      m = addMessage(m, "user", trimmed);
      const reply = `Excelente elección. Lanzamos "${selected.title}" como venture. ¿Confirmas? (sí/no)`;
      m = addMessage(m, "ceo", reply, true);
      m = { ...m, discoveryProfile: { ...(m.discoveryProfile ?? {}), selectedOpportunity: selected.id } };
      return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
    }
  }

  // Confirm venture from discovery
  if (mission.discoveryProfile?.selectedOpportunity && /^(s[ií]|yes|ok|confirmo)/i.test(trimmed)) {
    return null; // handled async in processConversationTurn
  }

  // Exit strategy — user selects or mentions exit path
  if (shouldShowExitStrategy(mission)) {
    const exitResult = handleExitStrategyInput(mission, trimmed);
    if (exitResult) return exitResult;
  }

  // GTM intent — user asks to launch / go to market
  if (detectGTMIntent(trimmed) && mission.intention && mission.intention !== "DISCOVERY") {
    return null;
  }

  // Investor intent — user asks about funding / investment
  if (detectInvestorIntent(trimmed, mission) && mission.intention && mission.intention !== "DISCOVERY") {
    return null;
  }

  if (!mission.intention) {
    const intent = classifyMissionIntent(trimmed);
    if (intent.confidence < 0.3 && intent.clarifyingQuestion) {
      const reply = ceoClarifyingVoice(intent.clarifyingQuestion);
      let m = addMessage(mission, "user", trimmed);
      m = timelineForIdeaRegistered(m, trimmed);
      m = addMessage(m, "ceo", reply, true);
      return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
    }
    let m = addMessage(mission, "user", trimmed);
    m = timelineForIdeaRegistered(m, trimmed);
    const explanation = formatCeoIntentionExplanation(intent);
    const result = handleIntentionSet(m, intent.primary, intent.extractedIdea || trimmed);
    const topic = intent.secondary?.includes("APPLICATION") ? "¿Cuál es tu cliente objetivo principal?" : undefined;
    const reply = topic
      ? `${explanation}\n\n${topic}`
      : explanation;
    let updated = result.mission;
    const messages = [...updated.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ceo") {
        messages[i] = { ...messages[i], content: reply, decisionPrompt: !!topic };
        break;
      }
    }
    updated = { ...updated, messages };
    return { ...result, mission: updated, reply, awaitingInput: !!topic };
  }

  let m = addMessage(mission, "user", trimmed);
  if (mission.phase === "UNDERSTAND") {
    m = { ...m, idea: trimmed };
    m = advancePhase(m);
    m = timelineForPhaseAdvance(m, m.phase);
  }

  if (detectInvestorIntent(trimmed, mission)) {
    return null;
  }

  if (
    m.intention &&
    m.intention !== "DISCOVERY" &&
    m.phase === "PLAN" &&
    !m.liveExecution.active &&
    trimmed.length > 5
  ) {
    return null;
  }

  return continueMissionFlow(m);
}

function handleIntentionSet(mission: Mission, intention: IntentionType, idea: string): ConversationTurnResult {
  let m = setIntention(mission, intention, idea);
  m = timelineForIdeaRegistered(m, idea);

  if (intention === "DISCOVERY") {
    m = addMessage(m, "user", idea || intention);
    return continueDiscoveryFlow(m);
  }

  const reply = `Perfecto. Vamos a ${m.title.toLowerCase()}. ¿Cuál es la idea en una frase?`;
  m = addMessage(m, "ceo", reply, true);
  return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
}

function continueDiscoveryFlow(mission: Mission): ConversationTurnResult {
  if (!isDiscoveryComplete(mission)) {
    const q = getNextDiscoveryQuestion(mission)!;
    const reply = q.prompt;
    let m = addMessage(mission, "ceo", reply, true);
    m = updateCeoStatus(m, { ceoStatus: "Modo descubrimiento activo", confidence: 50 });
    return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
  }

  const opps = generateOpportunities(mission);
  const reply = `Estas son tus mejores oportunidades:\n${formatOpportunityList(opps)}\n\nElige una (1, 2 o 3).`;
  let m = addMessage(mission, "ceo", reply, true);
  m = updateSnapshotProgress(m, "research", 100);
  m = updateSnapshotProgress(m, "businessModel", 60);
  return { mission: m, reply, awaitingInput: true, showExecutiveBanner: false };
}

async function startFactoryFlow(
  mission: Mission,
  intention: IntentionType,
  idea: string
): Promise<ConversationTurnResult> {
  let m = setIntention(mission, intention, idea);
  m = seedDecisionsForIntention(m);
  m = startLiveExecution(m);

  try {
    const route = await routeToFactory(intention, idea);
    m = { ...m, projectId: route.projectId, factoryRoute: route.href };
    m = emitMissionEventAsync(m, "factory_step", `Factory: ${route.label}`, { department: "CTO" });
    m = timelineForDeployStub(m, "Cloud foundation preparado");
  } catch {
    m = emitMissionEventAsync(m, "factory_step", "Factory: modo simulado activo", { department: "CTO" });
  }

  const domains = snapshotsForIntention(intention);
  for (const d of domains) {
    m = updateSnapshotProgress(m, d, 20);
  }

  m = advancePhase(m);
  m = timelineForPhaseAdvance(m, m.phase);

  const pending = getNextPendingDecision(m);
  let reply: string;
  if (pending && shouldPauseForDecision(m)) {
    reply = formatDecisionPrompt(pending);
    m = addMessage(m, "ceo", reply, true);
  } else {
    m = autoResolveIfAllowed(m);
    reply = `Equipo activado. Estamos en fase ${m.phase}. Sigo avanzando.`;
    m = addMessage(m, "ceo", reply);
  }

  const showBanner = shouldShowExecutiveCouncil(m, idea);
  return {
    mission: m,
    reply,
    awaitingInput: !!getNextPendingDecision(m)?.important,
    showExecutiveBanner: showBanner,
    routeHint: m.factoryRoute,
    executiveBoardReviewing: showBanner,
  };
}

function continueMissionFlow(mission: Mission): ConversationTurnResult {
  let m = mission;

  // Simulate execution step
  if (m.liveExecution.active) {
    m = advanceExecutionStep(m);
    const step = m.liveExecution.steps.find((s) => s.status === "completed");
    if (step) {
      m = appendTimelineEvent(m, `${step.label} completado`, m.phase, "✅");
      m = emitMissionEventAsync(m, "execution", step.label, { department: step.department, icon: "⚙️" });
    }
  }

  m = autoResolveIfAllowed(m);
  const pending = getNextPendingDecision(m);

  if (pending && shouldPauseForDecision(m)) {
    const reply =
      m.autonomous?.pendingApproval
        ? formatApprovalQuestion(m.autonomous.pendingApproval)
        : isApprovalDecision(pending)
          ? `${pending.title}: ${pending.description} — Responde sí o no.`
          : formatDecisionPrompt(pending);
    m = addMessage(m, "ceo", reply, true);
    return {
      mission: m,
      reply,
      awaitingInput: true,
      showExecutiveBanner: pending.important,
    };
  }

  if (m.phase !== "EVOLVE") {
    m = advancePhase(m);
    m = timelineForPhaseAdvance(m, m.phase);
    const domains = snapshotsForIntention(m.intention!);
    const idx = MISSION_PHASE_INDEX(m.phase);
    if (domains[idx]) m = updateSnapshotProgress(m, domains[idx], Math.min(100, (idx + 1) * 25));
  }

  if (shouldAutoTriggerGTM(m.phase) && !m.gtmSnapshot?.generatedAt) {
    m = applyGTMToMission(m);
  }

  if (shouldAutoTriggerInvestor(m.phase) && !m.investorSnapshot?.generatedAt) {
    const existing = m.snapshots.find((s) => s.id === "investorReadiness");
    if (!existing || existing.progress === 0) {
      void applyInvestorModeAsync(m);
    }
  }

  const investorNote = m.investorSnapshot?.generatedAt ? ` Investor readiness: ${m.investorSnapshot.readinessScore}%.` : "";
  const reply = `Avanzamos a ${m.phase}. ${m.factoryRoute ? `Proyecto en ${m.factoryRoute}` : "Sigo coordinando."}${m.gtmSnapshot?.generatedAt ? " Plan GTM listo." : ""}${investorNote}`;
  m = addMessage(m, "ceo", reply);
  m = updateCeoStatus(m, {
    ceoStatus: `Fase ${m.phase}`,
    confidence: Math.min(98, m.status.confidence + 5),
  });

  const showBanner = shouldShowExecutiveCouncil(m);
  return {
    mission: m,
    reply,
    awaitingInput: false,
    showExecutiveBanner: showBanner,
    routeHint: m.factoryRoute,
  };
}

function MISSION_PHASE_INDEX(phase: string): number {
  const order = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"];
  return order.indexOf(phase);
}

export async function processConversationTurn(
  mission: Mission,
  input: string,
  cardId?: string
): Promise<ConversationTurnResult> {
  if (cardId) {
    return finalizeWithPairFounder(handleCardSelection(mission, cardId, input || undefined), input);
  }

  // Discovery venture confirm — async factory flow
  if (
    mission.discoveryProfile?.selectedOpportunity &&
    /^(s[ií]|yes|ok|confirmo)/i.test(input.trim())
  ) {
    let m = addMessage(mission, "user", input.trim());
    return finalizeWithPairFounder(await startFactoryFlow(m, "VENTURE", mission.idea || mission.title), input);
  }

  const result = handleUserMessage(mission, input);
  if (result === null) {
    if (detectGTMIntent(input.trim()) && mission.intention && mission.intention !== "DISCOVERY") {
      let m = addMessage(mission, "user", input.trim());
      m = await applyGTMAsync(m, true);
      const count = m.gtmSnapshot?.readyCount ?? 8;
      const reply = `Generé tu plan Go To Market con ${count} entregables. Abre la pestaña Lanzamiento para revisarlos.`;
      m = addMessage(m, "ceo", reply);
      return finalizeWithPairFounder(
        { mission: m, reply, awaitingInput: false, showExecutiveBanner: false, gtmGenerated: true },
        input
      );
    }
    if (detectInvestorIntent(input.trim(), mission) && mission.intention && mission.intention !== "DISCOVERY") {
      let m = addMessage(mission, "user", input.trim());
      const { mission: updated, score } = await applyInvestorModeAsync(m);
      m = updated;
      const reply = investorIntentReply(score);
      m = addMessage(m, "ceo", reply);
      return finalizeWithPairFounder(
        { mission: m, reply, awaitingInput: false, showExecutiveBanner: false, investorGenerated: true },
        input
      );
    }
    if (
      mission.intention &&
      mission.intention !== "DISCOVERY" &&
      mission.phase === "PLAN" &&
      !mission.liveExecution.active &&
      input.trim().length > 5
    ) {
      let m = addMessage(mission, "user", input.trim());
      m = { ...m, idea: input.trim() };
      return finalizeWithPairFounder(await startFactoryFlow(m, mission.intention, input.trim()), input);
    }
  }
  if (result) return finalizeWithPairFounder(result, input);

  return finalizeWithPairFounder(
    {
      mission,
      reply: "Continúa cuando estés listo.",
      awaitingInput: true,
      showExecutiveBanner: false,
    },
    input
  );
}

export async function resolveDecisionById(
  mission: Mission,
  decisionId: string,
  option: string
): Promise<ConversationTurnResult> {
  let m = resolveDecision(mission, decisionId, option);
  m = appendTimelineEvent(m, `Decisión: ${option}`, m.phase, "✅");
  return finalizeWithPairFounder(continueMissionFlow(m), option, "decision_resolved");
}
