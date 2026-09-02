import { NextRequest, NextResponse } from "next/server";
import {
  buildExecutionManagerSnapshot,
  runExecutionManagerMutation,
} from "@/lib/investment/execution-manager-snapshot";
import {
  resolveExecutionSafetyFlags,
  type ExecutionMutationAction,
} from "@/lib/investment/execution-manager-actions";
import type { ExecutionManagerState } from "@/lib/investment/execution-manager-status";
import { EXECUTION_MANAGER_STATES } from "@/lib/investment/execution-manager-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS: readonly ExecutionMutationAction[] = ["cancel", "modify", "duplicate"];

/** GET — Execution Manager snapshot (orders + safety + audit). */
export async function GET() {
  try {
    const snapshot = await buildExecutionManagerSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution Manager snapshot failed";
    const safety = resolveExecutionSafetyFlags({});
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        mode: safety.mode,
        orderExecution: safety.mutationsEnabled ? "enabled" : "disabled",
        safety,
        brokerConnected: null,
        dataSource: "UNAVAILABLE",
        orders: [],
        auditItems: [],
        executionAudit: [],
        note: message,
        error: message,
      },
      { status: 200 },
    );
  }
}

/**
 * POST — Cancel / Modify / Duplicate.
 * Gate OPEN when LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false; cancel hits IBKR.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      state?: string;
      orderId?: string | number;
      patch?: Record<string, unknown>;
    };
    const action = body.action as ExecutionMutationAction | undefined;
    if (!action || !ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          allowed: false,
          posture: "LOCKED",
          message: "LOCKED · unknown action — expected cancel|modify|duplicate",
          wouldMutateBroker: false,
        },
        { status: 400 },
      );
    }
    const state = (
      EXECUTION_MANAGER_STATES.includes(body.state as ExecutionManagerState)
        ? body.state
        : "Working"
    ) as ExecutionManagerState;

    const result = await runExecutionManagerMutation({
      action,
      state,
      orderId: body.orderId,
      patch: body.patch,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mutation action failed";
    const safety = resolveExecutionSafetyFlags({});
    return NextResponse.json(
      {
        allowed: false,
        posture: safety.gate,
        message: `${safety.gate} · ${message}`,
        wouldMutateBroker: false,
      },
      { status: 200 },
    );
  }
}
