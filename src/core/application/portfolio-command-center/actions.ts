"use server";

import { getCompositionRoot } from "@/src/core/composition";
import type { CreateVentureBatchCommand } from "@/src/core/application/portfolio/commands";

interface BatchInput {
  portfolioId: string;
  workspaceId: string;
  startMode: CreateVentureBatchCommand["payload"]["startMode"];
  ventures: CreateVentureBatchCommand["payload"]["ventures"];
}

export async function createPortfolioBatchAction(input: BatchInput) {
  const root = getCompositionRoot();
  const result = await root.application.commandBus.execute({
    type: "CreateVentureBatch",
    meta: {
      actorId: "portfolio-command-center",
      correlationId: `pcc-${Date.now()}`,
      commandId: `pcc-cmd-${Date.now()}`,
    },
    payload: {
      workspaceId: input.workspaceId,
      portfolioId: input.portfolioId,
      ventures: input.ventures,
      startMode: input.startMode,
    },
  });

  if (!result.ok) {
    return {
      ok: false as const,
      reason: result.error.message,
      results: [] as Array<{ name: string; status: "created" | "rejected" | "queued" | "blocked"; reason?: string; ventureId?: string }>,
    };
  }

  const data = result.data as { results?: Array<{ name: string; status: "created" | "rejected" | "queued" | "blocked"; reason?: string; ventureId?: string }> };
  return {
    ok: true as const,
    reason: "",
    results: data.results ?? [],
  };
}

export async function pauseVentureAction(input: {
  workspaceId: string;
  portfolioId: string;
  ventureId: string;
  reason: string;
}) {
  const root = getCompositionRoot();
  return root.application.commandBus.execute({
    type: "PauseVenture",
    meta: {
      actorId: "portfolio-command-center",
      correlationId: `pcc-${Date.now()}`,
      commandId: `pcc-cmd-${Date.now()}`,
    },
    payload: input,
  });
}

export async function resumeVentureAction(input: {
  workspaceId: string;
  portfolioId: string;
  ventureId: string;
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "PAUSED";
}) {
  const root = getCompositionRoot();
  return root.application.commandBus.execute({
    type: "ResumeVenture",
    meta: {
      actorId: "portfolio-command-center",
      correlationId: `pcc-${Date.now()}`,
      commandId: `pcc-cmd-${Date.now()}`,
    },
    payload: input,
  });
}
