/**
 * PROGRAM 6050 — Architecture check (delivery model invariants).
 * Run: node scripts/architecture-check-6050.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const delivery = path.join(root, "src", "core", "delivery");

const required = [
  "types.ts",
  "pipeline.ts",
  "kernel.ts",
  "index.ts",
  "artifact/registry.ts",
  "output/registry.ts",
  "output/adapters.ts",
  "codebase/registry.ts",
  "codebase/adapters.ts",
  "build/registry.ts",
  "preview/registry.ts",
  "preview/adapters.ts",
  "release/registry.ts",
  "deployment/registry.ts",
  "deployment/adapters.ts",
  "lineage/version-graph.ts",
  "lineage/change-impact.ts",
  "migration/migrator.ts",
  "fixtures/e2e-pipeline.ts",
  "__tests__/delivery-model-6050.test.ts",
];

const docs = [
  "docs/architecture-v2/delivery-model/README.md",
  "docs/architecture-v2/delivery-model/artifact.md",
  "docs/architecture-v2/delivery-model/output.md",
  "docs/architecture-v2/delivery-model/codebase.md",
  "docs/architecture-v2/delivery-model/build.md",
  "docs/architecture-v2/delivery-model/preview.md",
  "docs/architecture-v2/delivery-model/release.md",
  "docs/architecture-v2/delivery-model/deployment.md",
  "docs/architecture-v2/delivery-model/lineage.md",
  "docs/architecture-v2/delivery-model/migration.md",
];

const results = [];
function ok(label, pass, detail) {
  results.push({ label, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

for (const f of required) {
  ok(`delivery file ${f}`, fs.existsSync(path.join(delivery, f)));
}
for (const f of docs) {
  ok(`doc ${f}`, fs.existsSync(path.join(root, f)));
}

ok(
  "Studio tabs component",
  fs.existsSync(path.join(root, "components", "creation-output-studio", "DeliveryStudioTabs.tsx"))
);
ok(
  "snapshot API",
  fs.existsSync(path.join(root, "app", "api", "delivery", "[missionId]", "snapshot", "route.ts"))
);
ok(
  "migrate script",
  fs.existsSync(path.join(root, "scripts", "migrate-delivery-model-6050.ts"))
);
ok(
  "delivery-commands",
  fs.existsSync(path.join(root, "src", "core", "application", "delivery-commands.ts"))
);

// Zero React in core delivery modules
function walkTs(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTs(p, files);
    else if (name.endsWith(".ts") && !name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const coreFiles = walkTs(delivery).filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`));
let reactHits = 0;
for (const f of coreFiles) {
  const text = fs.readFileSync(f, "utf8");
  if (/from ["']react["']|from ["']react-dom["']|from ["']next\//.test(text)) {
    reactHits += 1;
    ok(`no React in ${path.relative(root, f)}`, false);
  }
}
ok("zero React in core delivery", reactHits === 0, `${coreFiles.length} files scanned`);

const types = fs.readFileSync(path.join(delivery, "types.ts"), "utf8");
ok("CanonicalArtifact distinct", types.includes("CanonicalArtifact"));
ok("CanonicalOutput distinct", types.includes("CanonicalOutput"));
ok("CanonicalCodebase distinct", types.includes("CanonicalCodebase"));
ok("CanonicalBuild distinct", types.includes("CanonicalBuild"));
ok("CanonicalPreview distinct", types.includes("CanonicalPreview"));
ok("CanonicalRelease distinct", types.includes("CanonicalRelease"));
ok("CanonicalDeployment distinct", types.includes("CanonicalDeployment"));
ok("pipeline stages listed", types.includes("Artifact") && types.includes("Deployment"));

const buildReg = fs.readFileSync(path.join(delivery, "build", "registry.ts"), "utf8");
ok("build immutability error", buildReg.includes("BuildImmutabilityError"));

const previewReg = fs.readFileSync(path.join(delivery, "preview", "registry.ts"), "utf8");
ok("visual non-executable gate", previewReg.includes("visualNonExecutable"));

const depReg = fs.readFileSync(path.join(delivery, "deployment", "registry.ts"), "utf8");
ok("dry-run ≠ real", depReg.includes("dry-run cannot claim realExecution"));

const passed = results.filter((r) => r.pass).length;
const total = results.length;
console.log(`\narchitecture:check 6050 — ${passed}/${total}`);
process.exit(passed === total ? 0 : 1);
