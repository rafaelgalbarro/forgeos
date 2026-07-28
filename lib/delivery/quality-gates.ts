/**
 * ForgeOS 2030.1 — mandatory quality gates (policy + CI stubs).
 */

import type {
  ForbiddenImportRule,
  QualityGate,
  QualityGateId,
  QualityGateResult,
} from "./types";

export const CRITICAL_ROUTES = [
  "/",
  "/dashboard",
  "/projects",
  "/new-app",
  "/design-system",
] as const;

export const OPTIONAL_ROUTES = ["/venture/[id]", "/intelligence/[id]"] as const;

export const FORBIDDEN_IMPORT_RULES: ForbiddenImportRule[] = [
  {
    id: "fos",
    pattern: /from\s+["']@\/lib\/fos["']/,
    scope: "components/dashboard",
    reason: "FOS kernel desconectado — no importar en dashboard.",
  },
  {
    id: "ceo",
    pattern: /from\s+["']@\/lib\/ceo["']/,
    scope: "components/dashboard",
    reason: "CEO office desconectado — no importar en dashboard.",
  },
  {
    id: "board",
    pattern: /from\s+["']@\/lib\/board["']/,
    scope: "components/dashboard",
    reason: "Board desconectado — no importar en dashboard.",
  },
  {
    id: "build-engine",
    pattern: /from\s+["']@\/lib\/build-engine["']/,
    scope: "components/dashboard",
    reason: "Build engine no debe entrar en componentes dashboard.",
  },
  {
    id: "platform",
    pattern: /from\s+["']@\/lib\/platform["']/,
    scope: "components/dashboard",
    reason: "Platform layer no wired en dashboard.",
  },
  {
    id: "programs",
    pattern: /from\s+["']@\/lib\/programs["']/,
    scope: "components/dashboard",
    reason: "Programs governance no wired en dashboard.",
  },
];

export const QUALITY_GATES: QualityGate[] = [
  {
    id: "build",
    title: "Production build",
    description: "npm run build debe terminar con exit 0.",
    mandatory: true,
    command: "npm run build",
  },
  {
    id: "reset-dev",
    title: "Dev environment reset",
    description: "npm run reset:dev limpia .next y arranca dev estable.",
    mandatory: true,
    command: "npm run reset:dev",
  },
  {
    id: "critical-routes",
    title: "Critical routes HTTP 200",
    description: `Rutas obligatorias: ${CRITICAL_ROUTES.join(", ")}. Opcionales: ${OPTIONAL_ROUTES.join(", ")}.`,
    mandatory: true,
  },
  {
    id: "forbidden-imports",
    title: "Forbidden imports in dashboard",
    description:
      "components/dashboard no debe importar lib/fos, lib/ceo, lib/board, lib/build-engine, lib/platform, lib/programs.",
    mandatory: true,
  },
  {
    id: "no-heavy-barrels",
    title: "No heavy barrels",
    description:
      "Evitar index.ts que re-exportan módulos enteros; exportar solo APIs necesarias.",
    mandatory: true,
  },
  {
    id: "no-logic-in-components",
    title: "No logic in React components",
    description:
      "Lógica de negocio en lib/; componentes solo presentación y composición.",
    mandatory: true,
  },
  {
    id: "fhis-new-ui",
    title: "FHIS for new UI",
    description:
      "Nueva UI debe seguir Forge Health & Interface Standards (design-system + docs).",
    mandatory: true,
  },
  {
    id: "scaffold-connection",
    title: "Scaffold connection policy",
    description:
      "Módulos scaffold (connected: false) no deben conectarse a app/ sin épica y release documentados.",
    mandatory: true,
  },
];

/** CI stub — actual build runs in pipeline, not here. */
export function runBuildGate(buildExitCode = 0): QualityGateResult {
  const passed = buildExitCode === 0;
  return {
    id: "build",
    passed,
    message: passed ? "npm run build → exit 0" : `npm run build → exit ${buildExitCode}`,
  };
}

/** CI stub — reset:dev documented; execution is external. */
export function runResetDevGate(resetOk = true): QualityGateResult {
  return {
    id: "reset-dev",
    passed: resetOk,
    message: resetOk ? "npm run reset:dev → OK" : "npm run reset:dev → falló",
  };
}

export function runCriticalRoutesGate(
  verifiedRoutes: string[],
  required: readonly string[] = CRITICAL_ROUTES,
): QualityGateResult {
  const missing = required.filter((route) => !verifiedRoutes.includes(route));
  const passed = missing.length === 0;
  return {
    id: "critical-routes",
    passed,
    message: passed
      ? `HTTP 200: ${required.join(", ")}`
      : `Rutas sin verificar: ${missing.join(", ")}`,
  };
}

/**
 * Scan source content for forbidden import patterns.
 * Used by CI scripts — pass file paths for error messages.
 */
export function checkForbiddenImportsInPaths(
  paths: string[],
  content: string,
): QualityGateResult {
  const violations: string[] = [];

  for (const rule of FORBIDDEN_IMPORT_RULES) {
    if (rule.pattern.test(content)) {
      const label = paths.length > 0 ? paths.join(", ") : rule.scope;
      violations.push(`${label}: ${rule.reason}`);
    }
  }

  return {
    id: "forbidden-imports",
    passed: violations.length === 0,
    message:
      violations.length === 0
        ? "Sin imports prohibidos en dashboard"
        : violations.join("; "),
  };
}

/** Policy stub — heavy barrel detection deferred to review/CI heuristics. */
export function runNoHeavyBarrelsGate(passed = true): QualityGateResult {
  return {
    id: "no-heavy-barrels",
    passed,
    message: passed
      ? "Sin barrels pesados detectados"
      : "Barrel re-exporta demasiados módulos",
  };
}

/** Policy stub — component logic lint helper for future ESLint rule. */
export function runNoLogicInComponentsGate(passed = true): QualityGateResult {
  return {
    id: "no-logic-in-components",
    passed,
    message: passed
      ? "Componentes sin lógica de negocio detectada"
      : "Lógica de negocio encontrada en componentes",
  };
}

/** Policy stub — FHIS compliance for new UI surfaces. */
export function runFhisNewUiGate(passed = true): QualityGateResult {
  return {
    id: "fhis-new-ui",
    passed,
    message: passed
      ? "UI nueva alineada con FHIS / design-system"
      : "UI nueva sin revisión FHIS",
  };
}

export function scaffoldConnectionGate(
  modulePath: string,
  connected: boolean,
): QualityGateResult {
  const passed = !connected;
  return {
    id: "scaffold-connection",
    passed,
    message: passed
      ? `${modulePath} permanece desconectado (scaffold)`
      : `${modulePath} marcado como conectado — requiere épica y release`,
  };
}

export function getQualityGate(id: QualityGateId): QualityGate | undefined {
  return QUALITY_GATES.find((gate) => gate.id === id);
}

export function evaluateQualityGates(
  results: QualityGateResult[],
): { passed: boolean; summary: string } {
  const mandatoryIds = new Set(
    QUALITY_GATES.filter((gate) => gate.mandatory).map((gate) => gate.id),
  );

  const byId = new Map<QualityGateId, QualityGateResult>();
  for (const result of results) {
    byId.set(result.id, result);
  }

  const failed: QualityGateResult[] = [];
  for (const id of mandatoryIds) {
    const result = byId.get(id);
    if (!result || !result.passed) {
      failed.push(
        result ?? { id, passed: false, message: "Gate no evaluado" },
      );
    }
  }

  const passed = failed.length === 0;
  const summary = passed
    ? `Todos los gates obligatorios pasaron (${mandatoryIds.size}/${mandatoryIds.size})`
    : `Gates fallidos: ${failed.map((gate) => gate.id).join(", ")}`;

  return { passed, summary };
}
