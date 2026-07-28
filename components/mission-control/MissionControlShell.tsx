"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Mission, MissionSnapshot } from "@/lib/mission-control/types";
import {
  createNewMission,
  getMissionById,
  saveMission,
  ensureSnapshots,
  setAutoPilot,
} from "@/lib/mission-control";
import { getMissionRepository } from "@/lib/mission-control/mission-repository";
import { missionToSession, pauseSession, resumeSession } from "@/lib/mission-control/mission-session";
import { ensureAutonomousState } from "@/lib/mission-control/auto-pilot";
import { processConversationTurn, resolveDecisionById, initializeMissionSession } from "@/lib/mission-control/conversation-engine";
import { dismissDigitalCEO } from "@/lib/mission-control/digital-ceo";
import type { ProactiveCEOState } from "@/lib/mission-control/digital-ceo/types";
import { advanceExecutionStep } from "@/lib/mission-control/live-execution";
import { createEmptyCeoInsight } from "@/lib/pair-founder";
import {
  createAutonomousState,
  tickAutonomous,
  buildPanelView,
  pauseAutonomousLoop,
  handleApprovalResponse,
} from "@/lib/mission-control/autonomous-build";
import { resumeAutonomous } from "@/lib/mission-control/autonomous-build/mission-resume";
import { formatApprovalQuestion } from "@/lib/mission-control/autonomous-build/mission-approval";
import { generateGTMPackage, attachGTMSnapshotToMission } from "@/lib/mission-control/go-to-market";
import { emitGTMDeliverable, emitGTMPlanReady } from "@/lib/mission-control/live-mission/event-emitter";
import { readInvestorPackage, generateInvestorPackage } from "@/lib/mission-control/investor-mode";
import type { InvestorPackage } from "@/lib/mission-control/investor-mode/types";
import {
  syncLiveMissionFromMission,
  advanceLiveMissionQueue,
} from "@/lib/mission-control/live-mission";
import { createEmptyLiveMissionState } from "@/lib/mission-control/live-mission/live-mission-snapshot";
import { buildSerializableSnapshot } from "@/lib/live-mission/live-mission-snapshot";
import { useLiveMissionSnapshot } from "@/lib/live-mission/live-mission-store";

const MissionStatusPanel = dynamic(() => import("./MissionStatusPanel").then((m) => m.MissionStatusPanel), { ssr: false });
const MissionConversation = dynamic(() => import("./MissionConversation").then((m) => m.MissionConversation), { ssr: false });
const MissionProgressPanel = dynamic(() => import("./MissionProgressPanel").then((m) => m.MissionProgressPanel), { ssr: false });
const LiveExecutionBar = dynamic(() => import("./LiveExecutionBar").then((m) => m.LiveExecutionBar), { ssr: false });
const LiveMissionTimeline = dynamic(() => import("./LiveMissionTimeline").then((m) => m.LiveMissionTimeline), { ssr: false });
const ExecutiveCouncilBanner = dynamic(() => import("./ExecutiveCouncilBanner").then((m) => m.ExecutiveCouncilBanner), { ssr: false });
const DecisionCenterPanel = dynamic(() => import("./DecisionCenterPanel").then((m) => m.DecisionCenterPanel), { ssr: false });
const AutoPilotToggle = dynamic(() => import("./AutoPilotToggle").then((m) => m.AutoPilotToggle), { ssr: false });
const CEOInsightsPanel = dynamic(() => import("./CEOInsightsPanel").then((m) => m.CEOInsightsPanel), { ssr: false });
const MissionActivityPanel = dynamic(() => import("./MissionActivityPanel").then((m) => m.MissionActivityPanel), { ssr: false });
const AutonomousBuildPanel = dynamic(() => import("./AutonomousBuildPanel").then((m) => m.AutonomousBuildPanel), { ssr: false });
const MissionApprovalModal = dynamic(() => import("./MissionApprovalModal").then((m) => m.MissionApprovalModal), { ssr: false });
const GoToMarketPanel = dynamic(() => import("./gtm/GoToMarketPanel").then((m) => m.GoToMarketPanel), { ssr: false });
const InvestorModePanel = dynamic(() => import("./investor/InvestorModePanel").then((m) => m.InvestorModePanel), { ssr: false });
const DigitalCEOPanel = dynamic(() => import("./digital-ceo/DigitalCEOPanel").then((m) => m.DigitalCEOPanel), { ssr: false });
const ProactiveOpeningMessage = dynamic(
  () => import("./digital-ceo/ProactiveOpeningMessage").then((m) => m.ProactiveOpeningMessage),
  { ssr: false }
);
const DailyPrioritiesList = dynamic(
  () => import("./digital-ceo/DailyPrioritiesList").then((m) => m.DailyPrioritiesList),
  { ssr: false }
);
const CEOBriefCard = dynamic(() => import("./digital-ceo/CEOBriefCard").then((m) => m.CEOBriefCard), { ssr: false });
const CompanyWorkspacesPanel = dynamic(
  () => import("./company/CompanyWorkspacesPanel").then((m) => m.CompanyWorkspacesPanel),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando Gestión Empresa…</div> }
);
const MissionControlToolbar = dynamic(() => import("./MissionControlToolbar").then((m) => m.MissionControlToolbar), { ssr: false });
const ValidationScoresPanel = dynamic(() => import("./ValidationScoresPanel").then((m) => m.ValidationScoresPanel), { ssr: false });
const ExitStrategyPanel = dynamic(() => import("./exit/ExitStrategyPanel").then((m) => m.ExitStrategyPanel), { ssr: false });
const CreatedOutputsPanelLoader = dynamic(
  () => import("./CreatedOutputsPanelLoader").then((m) => m.CreatedOutputsPanelLoader),
  { ssr: false, loading: () => <div style={{ padding: 16, fontSize: "0.8rem" }}>Cargando resultados…</div> }
);
const MissionDeliverablesPanelLoader = dynamic(
  () => import("./MissionDeliverablesPanelLoader").then((m) => m.MissionDeliverablesPanelLoader),
  { ssr: false, loading: () => <div style={{ padding: 16, fontSize: "0.8rem" }}>Cargando entregables…</div> }
);

import { shouldShowCompanyWorkspaces } from "@/lib/mission-control/autonomous-company/operate-phase-shared";
import { buildCompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/workspace-snapshots";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import {
  readExitStrategySelection,
  orchestrateExitStrategyChange,
  shouldShowExitStrategy,
  buildExitMetrics,
} from "@/lib/mission-control/exit-strategy";
import type { ExitStrategyType } from "@/lib/mission-control/exit-strategy";
import type { MissionSession } from "@/lib/mission-control/types";

interface Props {
  initialSnapshot: MissionSnapshot;
  missionId?: string;
  /** Workspace embed: hide duplicate autopilot strip; parent owns page chrome. */
  embedded?: boolean;
}

export function MissionControlShell({ initialSnapshot, missionId, embedded = false }: Props) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showGtmPanel, setShowGtmPanel] = useState(false);
  const [showInvestor, setShowInvestor] = useState(false);
  const [investorPkg, setInvestorPkg] = useState<InvestorPackage | null>(null);
  const [companySnapshot, setCompanySnapshot] = useState<CompanyWorkspacesSnapshot | null>(null);
  const [proactiveCEO, setProactiveCEO] = useState<ProactiveCEOState | null>(null);
  const [session, setSession] = useState<MissionSession | null>(null);
  const [showDecisions, setShowDecisions] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const decisionsRef = useRef<HTMLDivElement>(null);
  const artifactsRef = useRef<HTMLDivElement>(null);
  const [exitImpactWarning, setExitImpactWarning] = useState<string | undefined>();
  const execTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let m: Mission | undefined;
    if (missionId) m = getMissionById(missionId);
    if (!m) m = createNewMission();
    let ensured = ensureSnapshots(m);
    ensured = ensureAutonomousState(ensured);
    if (!ensured.autonomous && ensured.intention && ensured.intention !== "DISCOVERY") {
      ensured = { ...ensured, autonomous: createAutonomousState(ensured, ensured.autoPilot.enabled) };
    }
    if (!ensured.ceoInsight) {
      ensured.ceoInsight = createEmptyCeoInsight(ensured.status.confidence);
    }
    const session = initializeMissionSession(ensured);
    setProactiveCEO(session.proactiveState);
    const saved = ensureSnapshots(session.mission);
    saveMission(saved);
    setMission(saved);
    setSession(missionToSession(saved));
    const cachedInvestor = readInvestorPackage(saved.id);
    if (cachedInvestor) setInvestorPkg(cachedInvestor);
  }, [missionId]);

  const persist = useCallback((m: Mission) => {
    const synced = syncLiveMissionFromMission(ensureSnapshots(m));
    saveMission(synced);
    setMission(synced);
    setSession(missionToSession(synced));
    return synced;
  }, []);

  const runTurn = useCallback(
    async (text: string, cardId?: string) => {
      if (!mission) return;
      setLoading(true);
      try {
        const result = await processConversationTurn(mission, text, cardId);
        persist(result.mission);
        setShowBanner(result.showExecutiveBanner);
        if (result.gtmGenerated) setShowGtmPanel(true);
        if (result.investorGenerated) {
          const pkg = readInvestorPackage(result.mission.id);
          if (pkg) {
            setInvestorPkg(pkg);
            setShowInvestor(true);
          }
        }
        setInput("");
      } finally {
        setLoading(false);
      }
    },
    [mission, persist]
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    void runTurn(input);
  };

  const handleCardSelect = (cardId: string) => {
    void runTurn(input || "", cardId);
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    void runTurn(text);
  };

  const handleAutoPilot = (enabled: boolean) => {
    if (!mission) return;
    persist(setAutoPilot(mission, enabled));
  };

  const handleInvestorClick = () => {
    if (!mission) return;
    void (async () => {
      let pkg = readInvestorPackage(mission.id);
      if (!pkg) {
        pkg = await generateInvestorPackage(mission);
      }
      setInvestorPkg(pkg);
      setShowInvestor(true);
    })();
  };

  const handleResolveDecision = (decisionId: string, option: string) => {
    if (!mission) return;
    void (async () => {
      const result = await resolveDecisionById(mission, decisionId, option);
      persist(result.mission);
      setShowBanner(result.showExecutiveBanner);
    })();
  };

  const handleDismissProactiveCEO = () => {
    if (!proactiveCEO) return;
    setProactiveCEO(dismissDigitalCEO(proactiveCEO));
  };

  const handlePauseAutonomous = () => {
    if (!mission?.autonomous) return;
    const { mission: m, state } = pauseAutonomousLoop(mission, mission.autonomous);
    persist({ ...m, autonomous: state });
  };

  const handleResumeAutonomous = () => {
    if (!mission?.autonomous) return;
    const { mission: m, state } = resumeAutonomous(mission, mission.autonomous);
    persist({ ...m, autonomous: state, autoPilot: { ...mission.autoPilot, enabled: true, pausedForDecision: false } });
  };

  const handleApproveGate = () => {
    if (!mission?.autonomous?.pendingApproval) return;
    const { mission: m, state } = handleApprovalResponse(mission, mission.autonomous, true);
    persist({ ...m, autonomous: state });
  };

  const handleRejectGate = () => {
    if (!mission?.autonomous?.pendingApproval) return;
    const { mission: m, state } = handleApprovalResponse(mission, mission.autonomous, false);
    persist({ ...m, autonomous: state });
  };

  const handleRegenerateGTM = useCallback(() => {
    if (!mission) return;
    let m = mission;
    const result = generateGTMPackage(m, true);
    for (const ev of result.events) {
      m = emitGTMDeliverable(m, ev.label);
    }
    m = attachGTMSnapshotToMission(m, result.snapshot);
    m = emitGTMPlanReady(m);
    persist(m);
    setShowGtmPanel(true);
  }, [mission, persist]);

  const panelView = useMemo(
    () => (mission?.autonomous ? buildPanelView(mission.autonomous) : null),
    [mission?.autonomous]
  );

  useEffect(() => {
    if (!mission?.liveExecution.active) {
      if (execTimer.current) clearInterval(execTimer.current);
      return;
    }
    execTimer.current = setInterval(() => {
      setMission((prev) => {
        if (!prev?.liveExecution.active) return prev;
        const advanced = advanceExecutionStep(prev);
        saveMission(advanced);
        return advanced;
      });
    }, 2500);
    return () => {
      if (execTimer.current) clearInterval(execTimer.current);
    };
  }, [mission?.liveExecution.active, mission?.id]);

  // PROGRAM 5500 — autonomous build tick loop
  useEffect(() => {
    if (!mission?.autoPilot.enabled || !mission.autonomous) {
      if (autoTimer.current) clearInterval(autoTimer.current);
      return;
    }
    autoTimer.current = setInterval(() => {
      setMission((prev) => {
        if (!prev?.autonomous || !prev.autoPilot.enabled) return prev;
        const { mission: ticked, state, result } = tickAutonomous(prev, prev.autonomous);
        let updated = { ...ticked, autonomous: state };
        if (result.needsApproval && state.pendingApproval) {
          const lastMsg = updated.messages.at(-1);
          const prompt = formatApprovalQuestion(state.pendingApproval);
          if (lastMsg?.content !== prompt) {
            updated = {
              ...updated,
              messages: [
                ...updated.messages,
                {
                  id: `msg-auto-${Date.now()}`,
                  role: "ceo" as const,
                  content: prompt,
                  timestamp: new Date().toISOString(),
                  decisionPrompt: true,
                },
              ],
            };
          }
        }
        saveMission(updated);
        return updated;
      });
    }, 2000);
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [mission?.autoPilot.enabled, mission?.id, mission?.autonomous?.status]);

  // PROGRAM 5300 — live mission queue progression (non-blocking)
  useEffect(() => {
    const hasActiveTasks = mission?.liveMission?.tasks.some(
      (t) => t.status === "Queued" || t.status === "Running"
    );
    if (!hasActiveTasks) {
      if (queueTimer.current) clearInterval(queueTimer.current);
      return;
    }
    queueTimer.current = setInterval(() => {
      setMission((prev) => {
        if (!prev?.liveMission) return prev;
        const advanced = advanceLiveMissionQueue(prev);
        const synced = syncLiveMissionFromMission(advanced);
        saveMission(synced);
        return synced;
      });
    }, 3000);
    return () => {
      if (queueTimer.current) clearInterval(queueTimer.current);
    };
  }, [mission?.liveMission?.tasks, mission?.id]);

  const showCompany = mission ? shouldShowCompanyWorkspaces(mission) : false;
  const showExit = mission ? shouldShowExitStrategy(mission) : false;
  const exitSelection = mission ? readExitStrategySelection(mission.id) : null;
  const exitMetrics = useMemo(
    () => (mission && exitSelection ? buildExitMetrics(mission) : null),
    [mission, exitSelection?.strategy, exitSelection?.selectedAt]
  );
  const marketingProgress = mission?.snapshots.find((s) => s.id === "marketing")?.progress ?? 0;

  const liveSnapshot = useLiveMissionSnapshot(mission?.id);

  const handleExitStrategySelect = useCallback(
    (strategy: ExitStrategyType) => {
      if (!mission) return;
      const result = orchestrateExitStrategyChange(mission, strategy);
      let updated = result.mission;
      const metrics = buildExitMetrics(updated);
      if (metrics && updated.ceoInsight) {
        updated = {
          ...updated,
          ceoInsight: {
            ...updated.ceoInsight,
            exitReadiness: metrics.readiness,
            strategicAlignment: metrics.alignment,
            exitStrategyDelta: result.delta,
            deltaSinceLastTurn: result.delta?.summary ?? updated.ceoInsight.deltaSinceLastTurn,
          },
        };
      }
      persist(updated);
      setExitImpactWarning(result.impactWarning);
    },
    [mission, persist]
  );

  useEffect(() => {
    if (!mission || !showCompany) return;
    void buildCompanyWorkspacesSnapshot(mission.id, mission.phase, marketingProgress).then(setCompanySnapshot);
  }, [mission?.id, mission?.phase, showCompany, marketingProgress]);

  if (!mission) {
    return (
      <div className="fhis-page" style={{ padding: 32, textAlign: "center" }} role="status">
        Cargando Mission Control…
      </div>
    );
  }

  return (
    <div
      className={embedded ? "fhis-mc-shell immersive-root mc-shell-embedded" : "fhis-mc-shell immersive-root"}
      style={{ minHeight: embedded ? undefined : "100vh", background: embedded ? "transparent" : "var(--mc-background, var(--fhis-color-bg))" }}
      data-embedded={embedded ? "true" : "false"}
    >
      <MissionControlToolbar
        mission={mission}
        sessionStatus={session?.status}
        onPause={() => {
          if (!session) return;
          const paused = pauseSession(session);
          getMissionRepository().save(paused);
          setSession(paused);
          persist({ ...mission, autoPilot: { ...mission.autoPilot, pausedForDecision: true } });
        }}
        onResume={() => {
          if (!session) return;
          const resumed = resumeSession(session);
          getMissionRepository().save(resumed);
          setSession(resumed);
          persist({ ...mission, autoPilot: { ...mission.autoPilot, pausedForDecision: false, enabled: true } });
        }}
        onAutoContinue={() => handleAutoPilot(!mission.autoPilot.enabled)}
        onViewDecisions={() => {
          setShowDecisions(true);
          decisionsRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        onViewArtifacts={() => {
          setShowArtifacts(true);
          artifactsRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
        ventureSlug={session?.ventureSlug}
        autoContinueEnabled={mission.autoPilot.enabled}
      />
      {!embedded ? (
        <AutoPilotToggle
          state={mission.autoPilot}
          onChange={handleAutoPilot}
          autonomousStatus={panelView ? panelView.status : undefined}
        />
      ) : null}
      <LiveExecutionBar status={mission.liveExecution} />
      <ExecutiveCouncilBanner
        council={mission.status.executiveCouncil}
        session={mission.executiveBoard}
        visible={showBanner}
      />

      <MissionApprovalModal
        gate={mission.autonomous?.pendingApproval && !mission.autonomous.pendingApproval.resolved ? mission.autonomous.pendingApproval : null}
        onApprove={handleApproveGate}
        onReject={handleRejectGate}
      />

      <div
        className="fhis-mc-grid"
        style={{
          display: "grid",
          gridTemplateColumns: embedded ? "1fr" : "260px 1fr 320px",
          gap: 16,
          padding: embedded ? "12px" : "16px 16px 0",
          maxWidth: 1600,
          margin: "0 auto",
        }}
      >
        {!embedded ? (
          <aside>
            <MissionStatusPanel mission={mission} />
            {proactiveCEO?.briefs && (
              <>
                <div style={{ marginTop: 16 }}>
                  <DailyPrioritiesList priorities={proactiveCEO.briefs.dailyPriorities} compact />
                </div>
                <div style={{ marginTop: 16 }}>
                  <CEOBriefCard brief={proactiveCEO.briefs.ceoBrief} compact />
                </div>
              </>
            )}
            {showExit && (
              <div style={{ marginTop: 16 }}>
                <ExitStrategyPanel
                  selected={exitSelection?.strategy ?? null}
                  onSelect={handleExitStrategySelect}
                  impactWarning={exitImpactWarning}
                />
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <CEOInsightsPanel
                insight={
                  mission.ceoInsight ?? createEmptyCeoInsight(mission.status.confidence)
                }
              />
            </div>
            <div style={{ marginTop: 16 }} ref={decisionsRef}>
              <DecisionCenterPanel
                decisions={mission.pendingDecisions}
                onResolve={handleResolveDecision}
                decisionImpacts={exitMetrics?.decisionImpacts}
              />
            </div>
          </aside>
        ) : (
          <div ref={decisionsRef} style={{ display: "none" }} aria-hidden />
        )}

        <main style={{ minWidth: 0 }}>
          {proactiveCEO?.openingMessage && !proactiveCEO.dismissed && (
            <div style={{ marginBottom: 16 }}>
              <ProactiveOpeningMessage message={proactiveCEO.openingMessage} onDismiss={handleDismissProactiveCEO} />
            </div>
          )}
          {proactiveCEO?.briefs && !embedded ? (
            <div style={{ marginBottom: 16 }}>
              <DigitalCEOPanel state={proactiveCEO} />
            </div>
          ) : null}
          <MissionConversation
            mission={mission}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onCardSelect={handleCardSelect}
            onChipClick={handleChipClick}
            loading={loading}
          />
          {embedded && panelView ? (
            <div style={{ marginTop: 16 }}>
              <AutonomousBuildPanel
                view={panelView}
                pendingApprovalReason={mission.autonomous?.pendingApproval?.reason}
                onPause={handlePauseAutonomous}
                onResume={handleResumeAutonomous}
              />
            </div>
          ) : null}
          {embedded ? (
            <div style={{ marginTop: 16 }} ref={artifactsRef}>
              <MissionDeliverablesPanelLoader
                missionId={mission.id}
                ventureSlug={session?.ventureSlug}
                ideaText={mission.idea}
              />
              <div style={{ marginTop: 12 }}>
                <CreatedOutputsPanelLoader
                  missionId={mission.id}
                  ventureSlug={session?.ventureSlug}
                  ventureId={session?.ventureId}
                />
              </div>
            </div>
          ) : null}
        </main>

        {!embedded ? (
          <aside>
            {panelView && (
              <div style={{ marginBottom: 16 }}>
                <AutonomousBuildPanel
                  view={panelView}
                  pendingApprovalReason={mission.autonomous?.pendingApproval?.reason}
                  onPause={handlePauseAutonomous}
                  onResume={handleResumeAutonomous}
                />
              </div>
            )}
            <MissionActivityPanel
              liveMission={mission.liveMission ?? createEmptyLiveMissionState(mission.phase)}
              snapshot={liveSnapshot ?? buildSerializableSnapshot(mission)}
              missionId={mission.id}
              onRetry={() => {
                const m = getMissionById(mission.id);
                if (m) persist(m);
              }}
            />
            <div style={{ marginTop: 16 }} ref={artifactsRef}>
              <MissionDeliverablesPanelLoader
                missionId={mission.id}
                ventureSlug={session?.ventureSlug}
                ideaText={mission.idea}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <CreatedOutputsPanelLoader
                missionId={mission.id}
                ventureSlug={session?.ventureSlug}
                ventureId={session?.ventureId}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <MissionProgressPanel
                mission={mission}
                onInvestorClick={handleInvestorClick}
                exitStrategy={exitSelection?.strategy ?? null}
              />
            </div>
            {session?.validationScores && (
              <div style={{ marginTop: 16 }}>
                <ValidationScoresPanel scores={session.validationScores} />
              </div>
            )}
          </aside>
        ) : null}
      </div>

      {!embedded ? (
        <div style={{ padding: "0 16px 16px", maxWidth: 1600, margin: "0 auto" }}>
          <LiveMissionTimeline
            events={mission.liveMission?.events ?? []}
            timeline={mission.timeline}
            uiEvents={liveSnapshot?.recentEvents ?? []}
          />
        </div>
      ) : null}

      {showGtmPanel && mission.gtmSnapshot && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 16px 16px" }}>
          <GoToMarketPanel missionId={mission.id} onRegenerate={handleRegenerateGTM} />
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" style={{ marginTop: 8 }} onClick={() => setShowGtmPanel(false)}>
            Cerrar GTM
          </button>
        </div>
      )}

      {showInvestor && investorPkg && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 16px 16px" }}>
          <InvestorModePanel pkg={investorPkg} onClose={() => setShowInvestor(false)} />
        </div>
      )}

      {showCompany && companySnapshot && !embedded && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 16px 16px" }}>
          <CompanyWorkspacesPanel snapshot={companySnapshot} />
        </div>
      )}

      <footer style={{ textAlign: "center", padding: 8, fontSize: "0.75rem", color: "var(--mc-text-muted, var(--fhis-color-text-muted))" }}>
        {initialSnapshot.version}
        {initialSnapshot.gtmProgramVersion && ` · ${initialSnapshot.gtmProgramVersion}`}
      </footer>
    </div>
  );
}
