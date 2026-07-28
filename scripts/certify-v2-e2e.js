/**
 * PROGRAM 6080 — V2 End-to-End Certification (structural + fixture evidence).
 *
 * Honest certification only. Does NOT invent remote URLs or live data.
 * Marks DEMO / ESTIMATED / DRY_RUN / HEURISTIC / MOCK when detected.
 *
 * Run: node scripts/certify-v2-e2e.js
 * Optional: FORGEOS_CERT_TRY_TSX=1 to attempt delivery fixture via npx tsx
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CERT_DIR = path.join(ROOT, "docs", "architecture-v2", "certification");
const FIXTURE_PATH = path.join(CERT_DIR, "fixtures", "cert-6080-mission.json");
const EVIDENCE_PATH = path.join(CERT_DIR, "e2e-evidence.json");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readText(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function step(id, label, status, evidence, notes, markers) {
  return {
    id,
    label,
    status, // PASS | FAIL | SKIPPED | PARTIAL
    evidence: evidence || [],
    notes: notes || "",
    markers: markers || [],
  };
}

function detectMarkers(text) {
  if (!text) return [];
  const markers = [];
  const rules = [
    ["DEMO", /\bDEMO\b|source:\s*["']demo["']/i],
    ["HEURISTIC", /\bHEURISTIC\b|source:\s*["']heuristic["']/i],
    ["DRY_RUN", /\bDRY_RUN\b|dry[-_ ]?run/i],
    ["ESTIMATED", /\bESTIMATED\b|kind:\s*["']estimated["']/i],
    ["MOCK", /\bMOCK\b|\[MOCK\]/i],
    ["STUB", /\bstub\b/i],
  ];
  for (const [name, re] of rules) {
    if (re.test(text)) markers.push(name);
  }
  return [...new Set(markers)];
}

function loadFixture() {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  return JSON.parse(raw);
}

function tryDeliveryFixtureViaTsx() {
  const tryTsx = process.env.FORGEOS_CERT_TRY_TSX === "1";
  if (!tryTsx) {
    return {
      status: "SKIPPED",
      notes: "NOT AUTOMATED in default run. Set FORGEOS_CERT_TRY_TSX=1 to attempt npx tsx delivery E2E.",
      markers: ["DRY_RUN"],
    };
  }

  const entry = path.join(ROOT, "src", "core", "delivery", "__tests__", "delivery-model-6050.test.ts");
  if (!fs.existsSync(entry)) {
    return { status: "FAIL", notes: "delivery-model-6050.test.ts missing", markers: [] };
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", entry],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
      timeout: 120000,
      shell: false,
    }
  );

  const ok = result.status === 0;
  return {
    status: ok ? "PASS" : "FAIL",
    notes: ok
      ? "Delivery model 6050 test exited 0 via tsx"
      : `tsx exit ${result.status}: ${(result.stderr || result.stdout || "").slice(0, 800)}`,
    markers: ["DRY_RUN"],
    exitCode: result.status,
  };
}

function certifyFlow(fixture) {
  const intention = readText("lib/mission-control/intention-engine.ts");
  const plan = readText("src/core/orchestration/planning/mission-execution-plan.ts");
  const decisions = readText("lib/mission-control/decision-center.ts");
  const deliveryTypes = readText("src/core/delivery/types.ts");
  const lineage = readText("src/core/delivery/lineage/version-graph.ts");
  const changeReq = readText("lib/creation-output/change-requests.ts");
  const impact = readText("lib/multi-output/output-impact-analysis.ts");
  const previewDeploy = readText("lib/preview-deployment/config.ts");
  const companyPage = exists("app/company/page.tsx");
  const presentationMission = exists("src/presentation/actions/create-mission-action.ts");
  const appPortsStub = readText("src/core/application/ports.ts");
  const appPortsFull = readText("src/core/application/ports/index.ts");
  const domainReadme = readText("src/core/domain/README.md");

  const chain = [];

  chain.push(
    step(
      "intent",
      "Intent",
      intention ? "PARTIAL" : "FAIL",
      ["lib/mission-control/intention-engine.ts", FIXTURE_PATH],
      intention
        ? "Keyword/HEURISTIC classifyMissionIntent exists (legacy 5150). V2 CreateMission action exists but application layer typecheck/build currently FAIL."
        : "Intention engine missing",
      detectMarkers(intention)
    )
  );

  chain.push(
    step(
      "mission",
      "Mission",
      exists("lib/mission-control/mission-session.ts") && presentationMission ? "PARTIAL" : "FAIL",
      [
        "lib/mission-control/mission-session.ts",
        "src/presentation/actions/create-mission-action.ts",
        "docs/architecture-v2/certification/fixtures/cert-6080-mission.json",
      ],
      `Generic fixture missionId=${fixture.mission.missionId}. Runtime still primarily localStorage / legacy Mission Control; V2 presentation depends on broken ApplicationPorts export path.`,
      ["HEURISTIC"]
    )
  );

  chain.push(
    step(
      "decisions",
      "Decisions",
      decisions ? "PARTIAL" : "FAIL",
      ["lib/mission-control/decision-center.ts"],
      "Decision center present; seeded/heuristic options documented in 5150 gaps.",
      detectMarkers(decisions)
    )
  );

  chain.push(
    step(
      "plan",
      "Plan",
      plan ? "PARTIAL" : "FAIL",
      ["src/core/orchestration/planning/mission-execution-plan.ts"],
      "6030 buildCanonicalMissionPlan exists with ESTIMATED costs and default DRY_RUN mode. Not proven wired end-to-end through UI for this fixture.",
      detectMarkers(plan)
    )
  );

  chain.push(
    step(
      "artifacts",
      "Artifacts",
      exists("src/core/delivery/artifact/registry.ts") ? "PARTIAL" : "FAIL",
      ["src/core/delivery/artifact/registry.ts", "src/core/delivery/types.ts"],
      "6050 CanonicalArtifact + in-memory registry exist. Live mission→artifact persistence not certified.",
      detectMarkers(deliveryTypes)
    )
  );

  chain.push(
    step(
      "outputs",
      "Outputs",
      exists("src/core/delivery/output/registry.ts") && exists("lib/creation-output/types.ts")
        ? "PARTIAL"
        : "FAIL",
      ["src/core/delivery/output/registry.ts", "lib/creation-output/types.ts"],
      "Dual surface: V2 delivery output registry + legacy creation-output. Dual-write not proven live.",
      []
    )
  );

  chain.push(
    step(
      "codebases",
      "Codebases",
      exists("src/core/delivery/codebase/registry.ts") ? "PARTIAL" : "FAIL",
      ["src/core/delivery/codebase/registry.ts", "lib/code-generation"],
      "Canonical codebase model present; real generator path is legacy lib/code-generation.",
      []
    )
  );

  chain.push(
    step(
      "builds",
      "Builds",
      exists("src/core/delivery/build/registry.ts") ? "PARTIAL" : "FAIL",
      ["src/core/delivery/build/registry.ts", "lib/build-platform"],
      "Build registry contracts exist. Product build of ForgeOS itself FAILED during certification (see build-procedure-evidence.json).",
      []
    )
  );

  chain.push(
    step(
      "previews",
      "Previews",
      exists("lib/preview-runtime") && exists("app/studio") ? "PARTIAL" : "FAIL",
      ["lib/preview-runtime", "app/studio/[missionId]/preview"],
      "Preview runtime module + studio routes exist. Live smoke NOT_RUN (build fail / port conflict).",
      []
    )
  );

  chain.push(
    step(
      "release",
      "Release",
      exists("src/core/delivery/types.ts") ? "PARTIAL" : "FAIL",
      ["src/core/delivery/types.ts", "lib/build-platform/release-manager"],
      "CanonicalRelease types exist. Release managers are local/stub — not production deployers.",
      ["STUB"]
    )
  );

  const deployCfg = previewDeploy || "";
  const deployEnabledDefault = /enablePreviewDeployment:\s*readBool\([^,]+,\s*false\)/.test(deployCfg);
  chain.push(
    step(
      "preview_deployment",
      "Preview Deployment",
      exists("lib/preview-deployment") ? "PARTIAL" : "FAIL",
      ["lib/preview-deployment/config.ts", "lib/preview-deployment/deployment-orchestrator.ts"],
      deployEnabledDefault
        ? "ENABLE_PREVIEW_DEPLOYMENT defaults false; dry-run / plan-only is the safe default. allowProduction defaults false."
        : "Preview deployment module present; verify flags before claiming real deploy.",
      ["DRY_RUN"]
    )
  );

  chain.push(
    step(
      "company_os",
      "Company OS",
      companyPage && exists("src/presentation") ? "PARTIAL" : "FAIL",
      ["app/company/page.tsx", "src/presentation", "app/os"],
      "Company routes + presentation layer + /os shell exist. Named 'Company OS' change-loop product path is not fully certified as a single V2 experience.",
      []
    )
  );

  chain.push(
    step(
      "change_request",
      "Change Request",
      changeReq ? "PARTIAL" : "FAIL",
      ["lib/creation-output/change-requests.ts", "src/core/delivery/lineage/change-impact.ts"],
      "Change requests implemented in creation-output (local persistence). V2 ChangePlan analysis exists in delivery lineage.",
      []
    )
  );

  chain.push(
    step(
      "impact_analysis",
      "Impact Analysis",
      impact && exists("src/core/delivery/lineage/change-impact.ts") ? "PARTIAL" : "FAIL",
      ["lib/multi-output/output-impact-analysis.ts", "src/core/delivery/lineage/change-impact.ts"],
      "Legacy impact analysis uses fixed SCENARIO_MAP (not live AST). V2 analyzeArtifactChange exists for delivery kernel.",
      ["HEURISTIC", "ESTIMATED"]
    )
  );

  chain.push(
    step(
      "new_version",
      "New Version",
      exists("lib/creation-output/output-versioning.ts") ? "PARTIAL" : "FAIL",
      ["lib/creation-output/output-versioning.ts", "src/core/delivery/types.ts"],
      "previousVersionId / createNewVersion exist. Full approve→new version→rebuild→preview loop not smoke-tested live.",
      []
    )
  );

  chain.push(
    step(
      "new_build",
      "New Build",
      exists("src/core/delivery/build/registry.ts") ? "PARTIAL" : "SKIPPED",
      ["src/core/delivery/build/registry.ts"],
      "Contract present; live rebuild after change request NOT AUTOMATED in this certification run.",
      ["NOT_AUTOMATED"]
    )
  );

  chain.push(
    step(
      "updated_preview",
      "Updated Preview",
      exists("lib/preview-runtime") ? "PARTIAL" : "SKIPPED",
      ["lib/preview-runtime", "app/studio/[missionId]/preview"],
      "Preview surfaces exist; updated preview after new build NOT AUTOMATED / NOT_RUN.",
      ["NOT_AUTOMATED"]
    )
  );

  // Structural blockers
  if (domainReadme && /thin stubs/i.test(domainReadme)) {
    chain.push(
      step(
        "domain_stub",
        "Domain Model Completeness (6010)",
        "PARTIAL",
        ["src/core/domain/README.md"],
        "Domain README states thin stubs; legacy lib/* remains SoT.",
        ["STUB"]
      )
    );
  }

  const buildEvidenceRaw = readText(
    "docs/architecture-v2/certification/build-procedure-evidence.json"
  );
  const portsSplit =
    (appPortsStub &&
      !/\bexport\s+(?:interface|type)\s+ApplicationPorts\b/.test(appPortsStub) &&
      appPortsFull &&
      /\bexport\s+interface\s+ApplicationPorts\b/.test(appPortsFull)) ||
    (buildEvidenceRaw && /ApplicationPorts/.test(buildEvidenceRaw) && /build/.test(buildEvidenceRaw));

  if (portsSplit) {
    chain.push(
      step(
        "application_ports_split",
        "Application Ports Export Coherence (6020)",
        "FAIL",
        [
          "src/core/application/ports.ts",
          "src/core/application/ports/index.ts",
          "src/core/application/handlers/command/index.ts",
          "docs/architecture-v2/certification/build-procedure-evidence.json",
        ],
        "handlers import ApplicationPorts from ../../ports (ports.ts stub) while ApplicationPorts lives in ports/index.ts — evidenced by next build type error.",
        ["STUB"]
      )
    );
  }

  return chain;
}

function certifyLineage() {
  const lineageFile = "src/core/delivery/lineage/version-graph.ts";
  const fixtureFile = "src/core/delivery/fixtures/e2e-pipeline.ts";
  const typesFile = "src/core/delivery/types.ts";
  const ok =
    exists(lineageFile) &&
    exists(fixtureFile) &&
    exists(typesFile) &&
    /VersionLineage/.test(readText(typesFile) || "") &&
    /buildVersionLineage/.test(readText(lineageFile) || "");

  return {
    status: ok ? "PARTIAL" : "FAIL",
    evidence: [lineageFile, fixtureFile, typesFile, "docs/architecture-v2/delivery-model/lineage.md"],
    notes: ok
      ? "6050 VersionLineage + buildVersionLineage + runDeliveryPipelineE2E fixture exist (in-memory / DRY_RUN). Not proven against live remote deployments."
      : "Lineage module incomplete",
    markers: ["DRY_RUN"],
    demonstratedLinks: ok
      ? [
          "decision/artifact → CanonicalArtifact",
          "artifact → CanonicalOutput.sourceArtifactIds",
          "output → CanonicalCodebase.outputId / sourceArtifactIds",
          "codebase → CanonicalBuild.codebaseId",
          "build → CanonicalPreview.buildId",
          "preview/outputs/builds → CanonicalRelease",
          "release → CanonicalDeployment.releaseId (dryRun must stay true for dry-run)",
        ]
      : [],
  };
}

function failureScenarios() {
  return [
    {
      id: "provider_unavailable",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["lib/connections", "docs/real-connections/dry-run.md"],
      notes: "Connections/real-build dry-run paths exist; no automated provider-down harness in 6080 run.",
    },
    {
      id: "ai_disabled",
      status: "PARTIAL",
      automation: "SCRIPTABLE",
      evidence: ["src/core/orchestration/planning/mission-execution-plan.ts"],
      notes: "Plan builder defaults DRY_RUN and fixture estimates when AI off — structural support present.",
      markers: ["DRY_RUN", "ESTIMATED"],
    },
    {
      id: "build_failure",
      status: "PASS",
      automation: "OBSERVED",
      evidence: ["docs/architecture-v2/certification/build-procedure-evidence.json"],
      notes: "ForgeOS itself failed npm run build during certification — real failure evidence captured.",
    },
    {
      id: "approval_rejected",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: [
        "src/core/orchestration/policies/approval-gates.ts",
        "lib/preview-deployment",
        "lib/mission-control/autonomous-build/approval-gates.ts",
      ],
      notes: "Approval types/gates exist across layers; rejected-path E2E not executed live.",
    },
    {
      id: "sandbox_timeout",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["lib/preview-runtime/sandbox-runner.ts", "lib/preview-runtime/sandbox-manager.ts"],
      notes: "Sandbox runner exists; timeout scenario not exercised in this run.",
    },
    {
      id: "deployment_failure",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["lib/preview-deployment/deployment-runner.ts", "lib/preview-deployment/config.ts"],
      notes: "Deployment runner + dry-run defaults; failure path not live-tested. No invented remote URLs.",
    },
    {
      id: "persistence_retry",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["docs/architecture-v2/persistence-audit.md", "lib/mission-control/mission-repository.ts"],
      notes: "Persistence largely localStorage/in-memory; retry semantics not certified product-wide.",
    },
    {
      id: "event_duplication",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["src/core/events/envelope.ts", "docs/architecture-v2/events"],
      notes: "6040 event envelope/catalog present; duplication handling not E2E proven.",
    },
    {
      id: "stale_version",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: ["src/core/delivery/types.ts", "lib/creation-output/output-versioning.ts"],
      notes: "previousVersionId / immutability rules documented; stale-version conflict test not run.",
    },
    {
      id: "user_pause_resume",
      status: "PARTIAL",
      automation: "NOT AUTOMATED",
      evidence: [
        "lib/mission-control/autonomous-build/mission-pause.ts",
        "src/core/application/commands.ts",
      ],
      notes: "PauseMission/ResumeMission command names + mission-pause module exist; UX loop not smoke-tested.",
    },
  ];
}

function securityChecks() {
  return [
    {
      id: "no_secrets_in_client",
      status: "PARTIAL",
      evidence: [
        "lib/connections/security/secret-redaction.ts",
        "lib/code-generation/security/secret-scanner.ts",
        "lib/preview-runtime/security/network-policy.ts",
      ],
      notes: "Scanners/redaction exist. Full client bundle secret scan not completed (build failed).",
    },
    {
      id: "no_production_deploy",
      status: "PASS",
      evidence: ["lib/preview-deployment/config.ts"],
      notes: "allowProduction defaults false; ENABLE_PREVIEW_DEPLOYMENT defaults false.",
      markers: ["DRY_RUN"],
    },
    {
      id: "command_authorization",
      status: "PARTIAL",
      evidence: ["lib/preview-runtime/security/command-allowlist.ts", "src/core/application/ports/index.ts"],
      notes: "Sandbox command allowlist is real. Application AuthorizationPort exists but layer does not build.",
    },
    {
      id: "workspace_isolation",
      status: "PARTIAL",
      evidence: ["src/core/domain/workspace", "src/core/application/ports/index.ts"],
      notes: "Workspace contracts + canAccessWorkspace port exist; multi-tenant isolation not live-certified.",
    },
    {
      id: "sandbox_isolation",
      status: "PARTIAL",
      evidence: ["lib/preview-runtime/sandbox-manager.ts", "docs/preview-runtime/security.md"],
      notes: "Process sandbox present; not full multi-tenant product isolation certification.",
    },
    {
      id: "approval_enforcement",
      status: "PARTIAL",
      evidence: [
        "lib/preview-deployment/config.ts",
        "src/core/orchestration/policies/approval-gates.ts",
      ],
      notes: "requireApproval defaults true for preview deployment policy. Fragmented across legacy + V2.",
    },
    {
      id: "audit_trail",
      status: "PARTIAL",
      evidence: ["lib/preview-deployment/deployment-audit.ts", "src/core/events"],
      notes: "Deployment audit + event catalogs exist; global mission audit bus not certified.",
    },
    {
      id: "safe_error_messages",
      status: "SKIPPED",
      evidence: [],
      notes: "NOT AUTOMATED — no live UI error-path review in this run (smoke NOT_RUN).",
      markers: ["NOT_AUTOMATED"],
    },
  ];
}

function uxPathChecklist() {
  return [
    { route: "/mission-control", purpose: "Start mission", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/mission-control/[missionId]", purpose: "Mission detail / decisions", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/studio/[missionId]", purpose: "See creations / outputs", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/studio/[missionId]/preview", purpose: "Try preview", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/studio/[missionId]/code", purpose: "Code / version surfaces", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/company", purpose: "Company OS overview", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/os/creator", purpose: "Creator without Factory lab", status: "EXISTS_ROUTE", verifiedLive: false },
    { route: "/deployments", purpose: "Publish preview / deployment history", status: "EXISTS_ROUTE", verifiedLive: false },
  ];
}

function legacyCompatibility() {
  return {
    evidence: ["docs/architecture-v2/experience-map.md", "lib/navigation/sidebar-items.ts"],
    notes:
      "Experience map inventories Core/Legacy/Lab routes. Live HTTP status not verified (smoke NOT_RUN). Legacy routes not claimed broken without evidence; not claimed healthy without HTTP checks.",
    status: "PARTIAL",
  };
}

function programInventory() {
  return [
    { program: "6000", status: "PARTIAL", evidence: ["docs/architecture-v2"] },
    { program: "6010", status: "PARTIAL", evidence: ["src/core/domain", "src/core/domain/README.md"], markers: ["STUB"] },
    { program: "6020", status: "FAIL", evidence: ["src/core/application", "build-procedure-evidence.json"], notes: "ApplicationPorts export split breaks build" },
    { program: "6030", status: "PARTIAL", evidence: ["src/core/orchestration"], markers: ["ESTIMATED", "DRY_RUN"] },
    { program: "6040", status: "PARTIAL", evidence: ["src/core/events"] },
    { program: "6050", status: "PARTIAL", evidence: ["src/core/delivery", "docs/architecture-v2/delivery-model"] },
    { program: "6060", status: "PARTIAL", evidence: ["src/presentation", "app/company"] },
    { program: "6070", status: "PARTIAL", evidence: ["src/core/migration", "docs/architecture-v2/migration"] },
    { program: "6080", status: "IN_PROGRESS", evidence: ["docs/architecture-v2/certification", "scripts/certify-v2-e2e.js"] },
  ];
}

function main() {
  fs.mkdirSync(path.join(CERT_DIR, "fixtures"), { recursive: true });
  const fixture = loadFixture();
  const flow = certifyFlow(fixture);
  const lineage = certifyLineage();
  const deliveryTsx = tryDeliveryFixtureViaTsx();
  const failures = failureScenarios();
  const security = securityChecks();
  const ux = uxPathChecklist();
  const legacy = legacyCompatibility();
  const programs = programInventory();

  const passCount = flow.filter((s) => s.status === "PASS").length;
  const failCount = flow.filter((s) => s.status === "FAIL").length;
  const partialCount = flow.filter((s) => s.status === "PARTIAL").length;
  const skippedCount = flow.filter((s) => s.status === "SKIPPED").length;

  const blockers = [];
  if (failCount > 0) {
    blockers.push({
      id: "flow_fail_steps",
      severity: "HIGH",
      technicalOwner: "application + integration",
      repair: "Resolve FAIL steps in e2e-evidence.json (notably ApplicationPorts export coherence and any missing modules).",
      closureCriteria: "All critical flow steps PASS or justified SKIPPED with owner sign-off; zero unexplained FAIL.",
    });
  }
  blockers.push({
    id: "product_build_fail",
    severity: "CRITICAL",
    technicalOwner: "integration (package.json/tsconfig) + application (ports exports)",
    repair: "Fix ApplicationPorts export so handlers import from ports/index; restore npm run build green.",
    closureCriteria: "npm run build exit 0 after clean; typecheck exit 0.",
    evidence: ["docs/architecture-v2/certification/build-procedure-evidence.json"],
  });
  blockers.push({
    id: "missing_npm_scripts",
    severity: "HIGH",
    technicalOwner: "integration",
    repair: "Add architecture:check, typecheck, and test scripts; wire package tests.",
    closureCriteria: "package.json scripts exist and exit 0 on clean tree.",
  });
  blockers.push({
    id: "live_smoke_not_run",
    severity: "HIGH",
    technicalOwner: "certification + platform",
    repair: "After green build, sequential reset:dev and smoke Mission Control / Studio / Company / Deployments.",
    closureCriteria: "HTTP 200 evidence for UX route checklist recorded in build-procedure-evidence.json.",
  });
  blockers.push({
    id: "unbroken_live_lineage",
    severity: "HIGH",
    technicalOwner: "delivery + mission-control",
    repair: "Wire generic mission fixture through live Intent→Deployment with VersionLineage snapshot persisted.",
    closureCriteria: "Artifact→Deployment path recorded for mission-cert-6080-aurora-ops without DEMO-only markers on critical links.",
  });

  const declaration = "FORGEOS V2 — CERTIFICATION BLOCKED";

  const evidence = {
    program: "6080",
    ranAt: new Date().toISOString(),
    declaration,
    fixture: {
      path: "docs/architecture-v2/certification/fixtures/cert-6080-mission.json",
      missionId: fixture.mission.missionId,
      requestedOutputs: fixture.mission.requestedOutputs,
    },
    flow: {
      summary: { pass: passCount, fail: failCount, partial: partialCount, skipped: skippedCount },
      steps: flow,
    },
    lineage,
    deliveryFixtureAttempt: deliveryTsx,
    failureScenarios: failures,
    security,
    uxPath: ux,
    legacyCompatibility: legacy,
    programs,
    blockers,
    honestyNotes: [
      "No remote URLs invented.",
      "No live provider credentials assumed.",
      "PARTIAL means contracts/modules exist but live E2E proof is incomplete.",
      "Prefer BLOCKED over false CERTIFIED.",
    ],
  };

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2), "utf8");
  console.log(`Wrote ${path.relative(ROOT, EVIDENCE_PATH)}`);
  console.log(`Declaration: ${declaration}`);
  console.log(
    `Flow: PASS=${passCount} FAIL=${failCount} PARTIAL=${partialCount} SKIPPED=${skippedCount}`
  );
  console.log(`Blockers: ${blockers.length}`);
  process.exit(failCount > 0 || blockers.some((b) => b.severity === "CRITICAL") ? 1 : 0);
}

main();
