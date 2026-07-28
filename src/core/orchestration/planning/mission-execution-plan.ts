/** PROGRAM 6030 — MissionExecutionPlan builder. */

import type { CostEstimate, DurationEstimate } from "../../domain/types";
import type {
  ApprovalRecord,
  ExecutionMode,
  MissionExecutionPlan,
  OutputSelectionItem,
  PlanPolicyBundle,
  WorkflowNode,
  WorkflowStage,
} from "../types";
import { assertValidGraph } from "../workflow/workflow-graph";

const DEFAULT_RETRY = { maxAttempts: 2, backoffMs: 250, retryable: true };

function estimate(amount: number, unit: CostEstimate["unit"], source: string): CostEstimate {
  return {
    amount,
    unit,
    confidence: 0.55,
    assumptions: ["Fixture-based estimate; not actual spend"],
    source,
    kind: "estimated",
  };
}

function duration(amount: number, unit: DurationEstimate["unit"], source: string): DurationEstimate {
  return {
    amount,
    unit,
    confidence: 0.55,
    assumptions: ["Deterministic dry-run timing model"],
    source,
    kind: "estimated",
  };
}

function node(
  partial: Omit<WorkflowNode, "status" | "progress" | "attempt" | "artifactRefs" | "retryPolicy" | "timeoutMs" | "executionMode"> &
    Partial<Pick<WorkflowNode, "retryPolicy" | "timeoutMs" | "executionMode" | "optional">>,
  mode: ExecutionMode,
): WorkflowNode {
  return {
    retryPolicy: DEFAULT_RETRY,
    timeoutMs: 30_000,
    executionMode: mode,
    status: "pending",
    progress: 0,
    attempt: 0,
    artifactRefs: [],
    optional: false,
    ...partial,
  };
}

export function defaultPolicies(): PlanPolicyBundle {
  return {
    productionAutoActivate: false,
    maxConcurrency: 3,
    maxWorkspaceCount: 2,
    maxProviderCalls: 20,
    maxEstimatedCost: estimate(25, "EUR", "policy-default"),
    allowParallelism: true,
    cancellationPropagates: true,
  };
}

export interface BuildPlanInput {
  missionId: string;
  objective: string;
  executionMode?: ExecutionMode;
  outputs?: OutputSelectionItem[];
}

/** Canonical first E2E flow graph (generic; fixtures when AI off). */
export function buildCanonicalMissionPlan(input: BuildPlanInput): MissionExecutionPlan {
  const mode = input.executionMode ?? "DRY_RUN";
  const now = new Date().toISOString();
  const planId = `plan_${input.missionId}`;

  const stages: WorkflowStage[] = [
    { stageId: "understand", label: "Understand Intent", nodeIds: ["n_understand"], status: "pending", progress: 0, weight: 1 },
    { stageId: "select", label: "Select Outputs", nodeIds: ["n_select_outputs"], status: "pending", progress: 0, weight: 1 },
    { stageId: "approve", label: "Approve Plan", nodeIds: ["n_approve_plan"], status: "pending", progress: 0, weight: 1 },
    { stageId: "generate", label: "Generate Assets", nodeIds: ["n_venture", "n_brand", "n_website", "n_webapp", "n_codebase"], status: "pending", progress: 0, weight: 5 },
    { stageId: "build", label: "Build", nodeIds: ["n_build"], status: "pending", progress: 0, weight: 2 },
    { stageId: "preview", label: "Preview & Release", nodeIds: ["n_preview", "n_release", "n_deploy"], status: "pending", progress: 0, weight: 3 },
  ];

  const nodes: WorkflowNode[] = [
    node({
      nodeId: "n_understand",
      type: "UNDERSTAND",
      label: "Understand Intent",
      stageId: "understand",
      inputReferences: ["intent:raw"],
      outputContract: "IntentProfile",
      dependencies: [],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "ceo",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_select_outputs",
      type: "DECIDE",
      label: "Select Outputs",
      stageId: "select",
      inputReferences: ["IntentProfile"],
      outputContract: "OutputSelectionDecision",
      dependencies: ["n_understand"],
      approvalPolicy: { required: true, gate: "RECOMMENDATION", autoApproveInDryRun: true },
      assignedDepartment: "product",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_approve_plan",
      type: "APPROVE",
      label: "Approve Plan",
      stageId: "approve",
      inputReferences: ["OutputSelectionDecision", "MissionExecutionPlan"],
      outputContract: "ApprovedPlan",
      dependencies: ["n_select_outputs"],
      approvalPolicy: { required: true, gate: "APPROVAL", autoApproveInDryRun: true },
      assignedDepartment: "ceo",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_venture",
      type: "GENERATE_OUTPUT",
      capability: "GenerateMarketResearch",
      label: "Generate Venture",
      stageId: "generate",
      inputReferences: ["ApprovedPlan"],
      outputContract: "VentureArtifact",
      dependencies: ["n_approve_plan"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "research",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_brand",
      type: "GENERATE_OUTPUT",
      capability: "GenerateBrand",
      label: "Generate Brand",
      stageId: "generate",
      inputReferences: ["VentureArtifact"],
      outputContract: "BrandArtifact",
      dependencies: ["n_venture"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "brand",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_website",
      type: "GENERATE_OUTPUT",
      capability: "GenerateWebsite",
      label: "Generate Website",
      stageId: "generate",
      inputReferences: ["BrandArtifact"],
      outputContract: "WebsiteArtifact",
      dependencies: ["n_brand"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "product",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_webapp",
      type: "GENERATE_OUTPUT",
      capability: "GenerateWebApplication",
      label: "Generate Web App",
      stageId: "generate",
      inputReferences: ["BrandArtifact", "VentureArtifact"],
      outputContract: "WebAppArtifact",
      dependencies: ["n_brand"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "engineering",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_codebase",
      type: "GENERATE_CODEBASE",
      capability: "GenerateCodebase",
      label: "Generate Codebase",
      stageId: "generate",
      inputReferences: ["WebsiteArtifact", "WebAppArtifact"],
      outputContract: "CodebaseArtifact",
      dependencies: ["n_website", "n_webapp"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "engineering",
      weight: 2,
    }, mode),
    node({
      nodeId: "n_build",
      type: "BUILD",
      capability: "BuildCodebase",
      label: "Build Codebase",
      stageId: "build",
      inputReferences: ["CodebaseArtifact"],
      outputContract: "BuildArtifact",
      dependencies: ["n_codebase"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "build",
      weight: 2,
    }, mode),
    node({
      nodeId: "n_preview",
      type: "CREATE_PREVIEW",
      capability: "CreatePreview",
      label: "Create Preview",
      stageId: "preview",
      inputReferences: ["BuildArtifact"],
      outputContract: "PreviewArtifact",
      dependencies: ["n_build"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "qa",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_release",
      type: "CREATE_RELEASE",
      label: "Release Preview",
      stageId: "preview",
      inputReferences: ["PreviewArtifact"],
      outputContract: "ReleaseArtifact",
      dependencies: ["n_preview"],
      approvalPolicy: { required: false, gate: "INFORMATION" },
      assignedDepartment: "ops",
      weight: 1,
    }, mode),
    node({
      nodeId: "n_deploy",
      type: "DEPLOY",
      capability: "DeployRelease",
      label: "Deployment Preview",
      stageId: "preview",
      inputReferences: ["ReleaseArtifact"],
      outputContract: "DeploymentArtifact",
      dependencies: ["n_release"],
      approvalPolicy: { required: true, gate: "DEPLOYMENT_APPROVAL", autoApproveInDryRun: true },
      assignedDepartment: "ops",
      weight: 1,
    }, mode),
  ];

  // Optional mobile when selected
  const includeMobile = (input.outputs ?? []).some(
    (o) => o.kind === "MOBILE" && o.requirement !== "excluded",
  );
  if (includeMobile) {
    nodes.push(
      node({
        nodeId: "n_mobile",
        type: "GENERATE_OUTPUT",
        capability: "GenerateMobileApplication",
        label: "Generate Mobile",
        stageId: "generate",
        inputReferences: ["BrandArtifact"],
        outputContract: "MobileArtifact",
        dependencies: ["n_brand"],
        approvalPolicy: { required: false, gate: "INFORMATION" },
        assignedDepartment: "engineering",
        weight: 1,
        optional: true,
      }, mode),
    );
    stages.find((s) => s.stageId === "generate")!.nodeIds.push("n_mobile");
    const codebase = nodes.find((n) => n.nodeId === "n_codebase")!;
    codebase.dependencies = [...codebase.dependencies, "n_mobile"];
    codebase.inputReferences = [...codebase.inputReferences, "MobileArtifact"];
  }

  assertValidGraph(nodes, stages);

  const approvals: ApprovalRecord[] = nodes
    .filter((n) => n.approvalPolicy.required)
    .map((n) => ({
      approvalId: `ap_${n.nodeId}`,
      gate: n.approvalPolicy.gate,
      nodeId: n.nodeId,
      status: "pending",
      requestedAt: now,
    }));

  const plan: MissionExecutionPlan = {
    planId,
    missionId: input.missionId,
    version: 1,
    objective: input.objective,
    stages,
    nodes,
    dependencies: nodes.flatMap((n) =>
      n.dependencies.map((from) => ({ from, to: n.nodeId, reason: "workflow" })),
    ),
    approvals,
    policies: defaultPolicies(),
    estimatedCost: estimate(12.5, "EUR", "plan-builder"),
    estimatedDuration: duration(8, "min", "plan-builder"),
    status: "draft",
    executionMode: mode,
    createdAt: now,
    updatedAt: now,
  };

  return plan;
}
