import { NextRequest, NextResponse } from "next/server";
import {
  buildExecutionManagerSnapshot,
  runExecutionManagerDryRunAction,
} from "@/lib/investment/execution-manager-snapshot";
import type { ExecutionMutationAction } from "@/lib/investment/execution-manager-actions";
import type { ExecutionManagerState } from "@/lib/investment/execution-manager-status";
import { EXECUTION_MANAGER_STATES } from "@/lib/investment/execution-manager-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS: readonly ExecutionMutationAction[] = ["cancel", "modify", "duplicate"];

/** GET — read-only Execution Manager snapshot (orders + safety + audit). */
export async function GET() {
  try {
    const snapshot = await buildExecutionManagerSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution Manager snapshot failed";
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        safety: {
          mode: "ANALYSIS_ONLY",
          liveTradingEnabled: false,
          liveTradingEnabledValue: process.env.LIVE_TRADING_ENABLED ?? "false",
          ibkrReadOnly: process.env.IBKR_READ_ONLY !== "false",
          killSwitchEnabled: false,
          autonomousLock: "LOCKED",
        },
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
 * POST — Cancel / Modify / Duplicate dry-run only.
 * Never proxies to broker place/cancel/modify endpoints.
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

    const result = runExecutionManagerDryRunAction({
      action,
      state,
      orderId: body.orderId,
      patch: body.patch,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dry-run action failed";
    return NextResponse.json(
      {
        allowed: false,
        posture: "LOCKED",
        message: `LOCKED · ${message}`,
        wouldMutateBroker: false,
      },
      { status: 200 },
    );
  }
}
