/**
 * PROGRAM 6050 — Delivery mission snapshot API (lazy Studio load).
 * Seeds deterministic E2E fixture when mission matches 6050 id or empty kernel.
 */

import { NextResponse } from "next/server";
import {
  createDeliveryKernel,
  runDeliveryPipelineE2E,
  DELIVERY_E2E_MISSION_ID,
} from "@/src/core/delivery";

const kernels = new Map<string, ReturnType<typeof createDeliveryKernel>>();

function getKernel(missionId: string) {
  let k = kernels.get(missionId);
  if (!k) {
    k = createDeliveryKernel();
    kernels.set(missionId, k);
    if (missionId === DELIVERY_E2E_MISSION_ID || missionId.includes("6050")) {
      runDeliveryPipelineE2E(k);
    }
  }
  return k;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ missionId: string }> }
) {
  const { missionId } = await ctx.params;
  const kernel = getKernel(missionId);
  const snapshot = kernel.snapshot(missionId);
  return NextResponse.json(snapshot);
}
