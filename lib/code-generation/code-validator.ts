/** PROGRAM 5360 — Static code validator (no compile — that's 5370). */

import type { CodeFile, CodeProject, CodeValidation, StaticValidationResult } from "./types";
import { validateCodeSecurity } from "./security/code-security-validator";

export function validateCodeProject(project: CodeProject): CodeValidation {
  const checks: CodeValidation["checks"] = [];
  const now = new Date().toISOString();

  // Empty files
  const emptyFiles = project.files.filter((f) => !f.content.trim());
  checks.push({
    id: "empty-files",
    label: "No empty files",
    status: emptyFiles.length === 0 ? "pass" : "fail",
    detail: emptyFiles.length > 0 ? `${emptyFiles.length} empty: ${emptyFiles.map((f) => f.path).join(", ")}` : undefined,
  });

  // Duplicate paths
  const paths = project.files.map((f) => f.path);
  const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
  checks.push({
    id: "duplicate-paths",
    label: "No duplicate file paths",
    status: dupes.length === 0 ? "pass" : "fail",
    detail: dupes.length > 0 ? dupes.join(", ") : undefined,
  });

  // package.json exists for node projects
  const hasPackageJson = project.files.some((f) => f.path === "package.json");
  if (["website", "web_application", "mobile", "backend", "fullstack"].includes(project.projectType)) {
    checks.push({
      id: "package-json",
      label: "package.json present",
      status: hasPackageJson ? "pass" : "fail",
    });
  }

  // README
  const hasReadme = project.files.some((f) => f.path === "README.md");
  checks.push({
    id: "readme",
    label: "README.md present",
    status: hasReadme ? "pass" : "warn",
  });

  // .env.example
  const hasEnvExample = project.files.some((f) => f.path === ".env.example");
  checks.push({
    id: "env-example",
    label: ".env.example present",
    status: hasEnvExample ? "pass" : "warn",
  });

  // Import syntax (basic)
  const importErrors = checkImportSyntax(project.files);
  checks.push({
    id: "import-syntax",
    label: "Import syntax valid",
    status: importErrors.length === 0 ? "pass" : "fail",
    detail: importErrors.slice(0, 3).join("; ") || undefined,
  });

  // Routes reference existing files
  if (project.routes.length > 0) {
    const missingRouteFiles = project.routes.filter(
      (r) => r.file && !project.files.some((f) => f.path === r.file)
    );
    checks.push({
      id: "route-files",
      label: "Route files exist",
      status: missingRouteFiles.length === 0 ? "pass" : "fail",
      detail: missingRouteFiles.map((r) => r.file).join(", ") || undefined,
    });
  }

  // Dependencies declared in package.json
  if (hasPackageJson) {
    const pkgFile = project.files.find((f) => f.path === "package.json")!;
    try {
      const pkg = JSON.parse(pkgFile.content) as { dependencies?: Record<string, string> };
      const declared = Object.keys(pkg.dependencies ?? {});
      checks.push({
        id: "deps-declared",
        label: "Dependencies in package.json",
        status: declared.length > 0 ? "pass" : "warn",
        detail: `${declared.length} dependencies`,
      });
    } catch {
      checks.push({ id: "deps-declared", label: "package.json parseable", status: "fail" });
    }
  }

  // Security scan
  const security = validateCodeSecurity(project.files);
  checks.push({
    id: "security",
    label: "Security scan passed",
    status: security.passed ? "pass" : "fail",
    detail: security.warnings.length > 0 ? `${security.warnings.length} issues` : undefined,
  });

  // TS conventions (basic)
  const tsFiles = project.files.filter((f) => f.path.endsWith(".ts") || f.path.endsWith(".tsx"));
  const tsIssues = tsFiles.filter((f) => f.content.includes("any") && !f.path.includes("test"));
  checks.push({
    id: "ts-conventions",
    label: "TypeScript conventions",
    status: tsIssues.length <= 2 ? "pass" : "warn",
    detail: tsIssues.length > 2 ? `${tsIssues.length} files use 'any'` : undefined,
  });

  const failCount = checks.filter((c) => c.status === "fail").length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);
  const result: StaticValidationResult =
    failCount === 0 ? "STATIC_VALIDATION_PASSED" : "STATIC_VALIDATION_FAILED";

  return {
    result,
    passed: failCount === 0,
    score,
    checks,
    validatedAt: now,
  };
}

function checkImportSyntax(files: CodeFile[]): string[] {
  const errors: string[] = [];
  const importFromRegex = /^import\s+(?:type\s+)?.+\s+from\s+['"][^'"]+['"]/;
  const importSideEffectRegex = /^import\s+['"][^'"]+['"]/;

  for (const file of files) {
    if (!file.path.match(/\.(ts|tsx|js|jsx)$/)) continue;
    const lines = file.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("import ")) continue;
      if (trimmed.startsWith("import(")) continue;
      if (importFromRegex.test(trimmed) || importSideEffectRegex.test(trimmed)) continue;
      errors.push(`${file.path}: malformed import`);
    }
  }
  return errors;
}

export function applyValidationToProject(project: CodeProject): CodeProject {
  const validation = validateCodeProject(project);
  const security = validateCodeSecurity(project.files);
  return {
    ...project,
    validation,
    warnings: [...project.warnings, ...security.warnings],
    status: validation.passed ? "READY_FOR_PREVIEW" : "INVALID",
    updatedAt: new Date().toISOString(),
  };
}
