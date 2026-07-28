/**
 * PROGRAM 6030 — Orchestration Kernel V2 E2E script.
 * Run: npx --yes tsx scripts/validate-orchestration-kernel.ts
 */

import {
  createOrchestrationKernel,
  ORCHESTRATION_KERNEL_VERSION,
} from "../src/core/orchestration";

async function main() {
  console.log(`\n▸ ${ORCHESTRATION_KERNEL_VERSION} E2E\n`);

  const kernel = createOrchestrationKernel();
  const missionId = "orch-e2e-generic-001";

  kernel.createMission({
    missionId,
    objective: "Generic deterministic fixture mission (AI off)",
    ideaText: "Create a SaaS website and web application with preview deployment",
    executionMode: "DRY_RUN",
  });

  console.log("1. Mission created");
  kernel.selectOutputs(missionId);
  console.log("2. Intent understood / outputs selected");
  kernel.approveOutputs(missionId);
  console.log("3. Output selection approved");
  kernel.approvePlan(missionId, "e2e");
  console.log("4. Plan approved");

  const plan = await kernel.start(missionId);
  const order = [
    "n_understand",
    "n_select_outputs",
    "n_approve_plan",
    "n_venture",
    "n_brand",
    "n_website",
    "n_webapp",
    "n_codebase",
    "n_build",
    "n_preview",
    "n_release",
    "n_deploy",
  ];

  for (const id of order) {
    const node = plan.nodes.find((n) => n.nodeId === id);
    const status = node?.status ?? "missing";
    console.log(`   ${status === "completed" ? "✓" : "✗"} ${id} → ${status}`);
    if (status !== "completed") {
      console.error("E2E failed at", id);
      process.exit(1);
    }
  }

  const snap = kernel.snapshot(missionId);
  console.log("\nSnapshot progress:", snap?.progress);
  console.log("Cost disclaimer:", snap?.cost.disclaimer);
  console.log(
    "Events:",
    kernel
      .getEvents(missionId)
      .map((e) => {
        const rec = e as { type?: string; eventType?: string };
        return rec.type ?? rec.eventType ?? "?";
      })
      .join(" → ")
  );

  console.log("\n✓ First E2E flow completed (fixtures / DRY_RUN)");
  console.log("PROGRAM 6030 — ORCHESTRATION KERNEL V2 VERIFICADO");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
