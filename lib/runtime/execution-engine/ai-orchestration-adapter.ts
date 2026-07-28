/** ForgeOS Execution Engine — mock AI orchestration adapter (Epic 4.5). */

import { getMockOutput } from "@/lib/ai-orchestration/mocks";
import type { OrchestrationTaskId } from "@/lib/ai-orchestration/types";
import type { FutureAdapterStub } from "./types";

export interface AiOrchestrationResult {
  taskId: string;
  output: string;
  provider: string;
  model: string;
  latencyMs: number;
  fallback: boolean;
  warnings: string[];
}

export interface AiOrchestrationAdapter {
  invoke(params: {
    ventureId: string;
    sessionId: string;
    workerId: string;
    taskType: string;
  }): AiOrchestrationResult;
  listFutureAdapters(): FutureAdapterStub[];
}

const FUTURE_ADAPTERS: FutureAdapterStub[] = [
  {
    id: "ai-runtime",
    label: "AI Runtime",
    status: "coming_soon",
    description: "Dedicated AI inference runtime — not connected in RC1.",
  },
  {
    id: "build-engine",
    label: "Build Engine",
    status: "coming_soon",
    description: "Automated build pipeline — not connected in RC1.",
  },
  {
    id: "marketing",
    label: "Marketing",
    status: "coming_soon",
    description: "Marketing automation module — not connected in RC1.",
  },
  {
    id: "finance",
    label: "Finance",
    status: "coming_soon",
    description: "Finance engine — not connected in RC1.",
  },
  {
    id: "legal",
    label: "Legal",
    status: "coming_soon",
    description: "Legal compliance engine — not connected in RC1.",
  },
  {
    id: "capital",
    label: "Capital",
    status: "coming_soon",
    description: "Capital fundraising engine — not connected in RC1.",
  },
];

const TASK_TYPE_TO_ORCHESTRATION: Partial<Record<string, OrchestrationTaskId>> = {
  CEO_REVIEW: "CEO_REVIEW",
  BOARD_REVIEW: "BOARD_CONSENSUS",
  RESEARCH_RUN: "CEO_BRIEF",
  PRODUCT_UPDATE: "CEO_REVIEW",
  BUILD: "BUILD_PLAN",
  QA: "BUILD_QA",
};

export function createAiOrchestrationAdapter(): AiOrchestrationAdapter {
  return {
    invoke(params) {
      const start = Date.now();
      const orchTask = TASK_TYPE_TO_ORCHESTRATION[params.taskType] ?? "CEO_BRIEF";
      const output = getMockOutput(orchTask);
      const latencyMs = Date.now() - start + 8;

      return {
        taskId: orchTask,
        output,
        provider: "mock",
        model: "none",
        latencyMs,
        fallback: true,
        warnings: ["Mock AI orchestration — no real automatic AI in RC1"],
      };
    },

    listFutureAdapters() {
      return FUTURE_ADAPTERS;
    },
  };
}
