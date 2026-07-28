/** Build Context — validation engine (Epic 6.0). */

import {
  BUILD_CONTEXT_SECTION_ORDER,
  type BuildContext,
  type BuildContextSectionId,
  type BuildContextSectionValidation,
  type BuildContextValidationIssue,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: BuildContextValidationIssue["severity"] = "warning",
  field?: string
): BuildContextValidationIssue {
  return { code, message, severity, field };
}

function scoreFromIssues(issues: BuildContextValidationIssue[]): number {
  let score = 100;
  for (const i of issues) {
    if (i.severity === "error") score -= 25;
    else if (i.severity === "warning") score -= 10;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function validateSection(
  context: BuildContext,
  id: BuildContextSectionId
): BuildContextSectionValidation {
  const section = context.sections[id];
  const issues: BuildContextValidationIssue[] = [];

  if (section.status === "empty") {
    issues.push(issue(`${id}_EMPTY`, `${section.label} is empty`, "warning"));
  }

  if (section.status === "stale") {
    issues.push(issue(`${id}_STALE`, `${section.label} may be outdated`, "warning"));
  }

  switch (id) {
    case "discovery":
      if (section.status !== "empty" && section.status !== "complete") {
        issues.push(issue("DISCOVERY_INCOMPLETE", "Discovery needs more answers", "warning"));
      }
      break;
    case "research":
      if (context.sections.discovery.status === "empty" && section.status !== "empty") {
        issues.push(issue("RESEARCH_WITHOUT_DISCOVERY", "Research without discovery", "info"));
      }
      break;
    case "productPrd":
      if (section.status === "empty") {
        issues.push(issue("PRD_MISSING", "Product PRD required for build", "error"));
      }
      break;
    case "buildPlan":
      if (context.sections.productPrd.status === "complete" && section.status === "empty") {
        issues.push(issue("BUILD_PLAN_MISSING", "Build plan missing after PRD", "error"));
      }
      break;
    case "architecture":
      if (section.status === "empty" && context.sections.buildPlan.status !== "empty") {
        issues.push(issue("ARCH_MISSING", "Architecture not defined", "warning"));
      }
      break;
    case "qa":
      if (context.sections.buildPlan.status === "complete" && section.status === "empty") {
        issues.push(issue("QA_MISSING", "QA plan recommended before launch", "info"));
      }
      break;
    case "security":
      if (section.status === "empty") {
        issues.push(issue("SECURITY_EMPTY", "Security section not documented", "warning"));
      }
      break;
    default:
      break;
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    valid: !hasErrors && section.status !== "empty",
    score: section.status === "empty" ? 0 : scoreFromIssues(issues),
    issues,
  };
}

export function validateBuildContext(context: BuildContext): BuildContext {
  const sections = { ...context.sections };

  for (const id of BUILD_CONTEXT_SECTION_ORDER) {
    const validation = validateSection(context, id);
    sections[id] = {
      ...sections[id],
      validation,
    };
  }

  return { ...context, sections };
}

export function getBuildContextBlockers(context: BuildContext): string[] {
  return BUILD_CONTEXT_SECTION_ORDER.flatMap((id) =>
    context.sections[id].validation.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
  );
}
