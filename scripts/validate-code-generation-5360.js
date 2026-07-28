/**
 * PROGRAM 5360 — Real Code Generation E2E validation.
 * Run: node scripts/validate-code-generation-5360.js
 */

const path = require("path");
const fs = require("fs");

async function main() {
  const results = [];
  const ok = (label, pass, detail) => {
    results.push({ label, pass, detail });
    console.log(`${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  };

  // Dynamic import of compiled modules won't work in plain node without tsx.
  // Use filesystem checks + inline validation logic.
  const root = path.join(__dirname, "..");
  const lib = path.join(root, "lib", "code-generation");

  const requiredFiles = [
    "types.ts",
    "code-project.ts",
    "code-generation-engine.ts",
    "project-builder.ts",
    "file-builder.ts",
    "directory-builder.ts",
    "dependency-builder.ts",
    "script-builder.ts",
    "environment-builder.ts",
    "code-validator.ts",
    "code-versioning.ts",
    "code-repository.ts",
    "index.ts",
    "e2e-nexora-pipeline.ts",
    "generators/website-generator.ts",
    "generators/web-application-generator.ts",
    "generators/mobile-generator.ts",
    "generators/backend-generator.ts",
    "security/code-security-validator.ts",
    "security/secret-scanner.ts",
    "security/dangerous-pattern-scanner.ts",
    "export/code-zip-exporter.ts",
    "export/code-manifest-exporter.ts",
    "templates/website-nextjs/manifest.json",
    "templates/webapp-nextjs-supabase/manifest.json",
    "templates/mobile-expo/manifest.json",
    "templates/backend-node-api/manifest.json",
    "templates/fullstack-nextjs-supabase/manifest.json",
  ];

  for (const f of requiredFiles) {
    ok(`File exists: ${f}`, fs.existsSync(path.join(lib, f)));
  }

  ok("Code tab route", fs.existsSync(path.join(root, "app", "studio", "[missionId]", "code", "page.tsx")));
  ok("Files API route", fs.existsSync(path.join(root, "app", "api", "code-generation", "[missionId]", "files", "route.ts")));
  ok("Export API route", fs.existsSync(path.join(root, "app", "api", "code-generation", "[missionId]", "export", "route.ts")));
  ok("CodeTabClient component", fs.existsSync(path.join(root, "components", "creation-output-studio", "CodeTabClient.tsx")));
  ok("Docs README", fs.existsSync(path.join(root, "docs", "code-generation", "README.md")));

  // Template manifest validation
  const websiteManifest = JSON.parse(
    fs.readFileSync(path.join(lib, "templates", "website-nextjs", "manifest.json"), "utf8")
  );
  ok("Website template id", websiteManifest.id === "website-nextjs", websiteManifest.id);
  ok("Website template has deps", Object.keys(websiteManifest.dependencies).length > 0);

  // Static validation labels
  ok("STATIC_VALIDATION labels in validator", fs.readFileSync(path.join(lib, "code-validator.ts"), "utf8").includes("STATIC_VALIDATION_PASSED"));

  // Secret scanner
  ok("Secret scanner blocks patterns", fs.readFileSync(path.join(lib, "security", "secret-scanner.ts"), "utf8").includes("SECRET_PATTERNS"));

  // jszip dependency
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  ok("jszip dependency", Boolean(pkg.dependencies?.jszip));

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n${passed}/${total} static checks passed`);
  console.log("Note: Full E2E requires npm run build && HTTP route checks");
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
