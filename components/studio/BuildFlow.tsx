"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { FORGE_WORKERS, THINKING_PHRASES } from "@/lib/workers/registry";
import { runWorkflow } from "@/lib/workflow";
import { buildVentureSections } from "@/lib/domain/venture-sections";
import { buildProjectDNA, dnaStore } from "@/lib/dna";
import { buildProject } from "@/lib/project";
import { getVentureById, saveVenture } from "@/lib/store/ventures";
import type { ProductPRDResponse } from "@/lib/ai/types/product";
import type { ResearchReportResponse } from "@/lib/ai/types/research";
import { runWorker } from "@/lib/workers/orchestrator";

type Phase = "thinking" | "workers";

interface WorkerState {
  status: "pending" | "running" | "done";
  startedAt?: number;
  completedAt?: number;
}

interface BuildFlowProps {
  ventureId: string;
}

export function BuildFlow({ ventureId }: BuildFlowProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("thinking");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [workers, setWorkers] = useState<Record<string, WorkerState>>(() =>
    Object.fromEntries(FORGE_WORKERS.map((w) => [w.id, { status: "pending" as const }]))
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const venture = getVentureById(ventureId);
    if (!venture) {
      router.replace("/");
      return;
    }
    if (venture.status !== "building" || !venture.intelligenceAccepted) {
      router.replace(`/intelligence/${ventureId}`);
      return;
    }

    let cancelled = false;

    async function run() {
      // Phase 1: Thinking mode
      for (let i = 0; i < THINKING_PHRASES.length; i++) {
        if (cancelled) return;
        const phrase = THINKING_PHRASES[i];
        setPhraseIndex(i);
        setMessages((prev) => [...prev, phrase]);
        await sleep(1200 + Math.random() * 400);
      }

      if (cancelled) return;
      setPhase("workers");

      const productRef: { value: ProductPRDResponse | null } = { value: null };
      const researchRef: { value: ResearchReportResponse | null } = { value: null };
      const workersExecuted: string[] = [];

      await runWorkflow({
        ventureId,
        onWorkerStart: (workerId) => {
          const start = Date.now();
          setWorkers((prev) => ({
            ...prev,
            [workerId]: { status: "running", startedAt: start },
          }));
        },
        executeWorker: async (workerId) => {
          const discoveryMetadata = venture!.discoveryContext
            ? { discoveryContext: venture!.discoveryContext }
            : {};
          const outcome = await runWorker({
            venture: venture!,
            workerId,
            metadata: {
              ...discoveryMetadata,
              ...(workerId === "product" && researchRef.value
                ? { researchReport: researchRef.value }
                : {}),
            },
          });
          workersExecuted.push(workerId);
          if (workerId === "research" && outcome.result.output?.researchReport) {
            researchRef.value = outcome.result.output.researchReport as ResearchReportResponse;
          }
          if (workerId === "product" && outcome.result.output?.productPRD) {
            productRef.value = outcome.result.output.productPRD as ProductPRDResponse;
          }

          setWorkers((prev) => ({
            ...prev,
            [workerId]: {
              status: "done",
              startedAt: prev[workerId]?.startedAt ?? Date.now(),
              completedAt: Date.now(),
            },
          }));
        },
      });

      if (cancelled) return;

      const productPRD = productRef.value;
      const researchReport = researchRef.value;
      const sections = buildVentureSections(venture!, productPRD, researchReport);
      const readyVenture = {
        ...venture!,
        status: "ready" as const,
        sections,
        productPRD: productPRD?.data ?? null,
        productPRDSource: productPRD?.source ?? "mock",
        productMeta: productPRD
          ? {
              source: productPRD.source,
              provider: productPRD.provider,
              usedResearch: productPRD.usedResearch,
              usedKnowledgeRefs: productPRD.usedKnowledgeRefs,
              fallbackUsed: productPRD.fallbackUsed,
            }
          : null,
        researchReport: researchReport?.data ?? null,
        researchMeta: researchReport
          ? {
              source: researchReport.source,
              provider: researchReport.provider,
              usedKnowledgeRefs: researchReport.usedKnowledgeRefs,
              fallbackUsed: researchReport.fallbackUsed,
            }
          : null,
      };

      saveVenture(readyVenture);
      buildProject({ venture: readyVenture, productPRD, researchReport });
      dnaStore.save(
        buildProjectDNA({ venture: readyVenture, workersExecuted, productPRD, researchReport })
      );

      await sleep(500);
      router.push(`/venture/${ventureId}`);
    }

    run();
    return () => { cancelled = true; };
  }, [ventureId, router]);

  const venture = getVentureById(ventureId);
  const currentPhrase = THINKING_PHRASES[phraseIndex];

  return (
    <div className="build-flow">
      <header className="studio-header">
        <Link href="/" className="studio-logo">Forge<span>OS</span></Link>
        <span className="build-venture-name">{venture?.name}</span>
      </header>

      <main className="build-main">
        {phase === "thinking" ? (
          <div className="thinking-mode">
            <div className="thinking-pulse" aria-hidden />
            <p className="thinking-current">{currentPhrase}</p>
            <div className="thinking-log">
              {messages.map((msg, i) => (
                <p key={i} className={clsx("thinking-line", i === messages.length - 1 && "thinking-line-active")}>
                  {msg}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="workers-mode">
            <h2 className="workers-title">Orchestrator activo</h2>
            <p className="workers-subtitle">Tu equipo de expertos está construyendo la startup.</p>
            <div className="workers-list">
              {FORGE_WORKERS.map((worker) => {
                const state = workers[worker.id];
                const elapsed = state.completedAt && state.startedAt
                  ? ((state.completedAt - state.startedAt) / 1000).toFixed(1)
                  : null;

                return (
                  <div
                    key={worker.id}
                    className={clsx(
                      "worker-row glass",
                      state.status === "running" && "worker-row-active",
                      state.status === "done" && "worker-row-done"
                    )}
                  >
                    <span className="worker-status-dot" data-status={state.status} aria-hidden />
                    <div className="worker-info">
                      <strong>{worker.name}</strong>
                      <span>{worker.role}</span>
                    </div>
                    <span className="worker-state">
                      {state.status === "done" ? `✓ ${elapsed}s` : state.status === "running" ? "Trabajando..." : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
