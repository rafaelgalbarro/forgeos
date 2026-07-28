/**
 * ForgeOS 2030.1 — delivery report factory, validation, and markdown export.
 */

import type { DeliveryReport, QualityGateResult } from "./types";

const REQUIRED_STRING_FIELDS: (keyof DeliveryReport)[] = [
  "programa",
  "epica",
  "release",
  "objetivo",
  "resultadoBuild",
  "rollbackPlan",
  "compatibilidad",
];

const REQUIRED_ARRAY_FIELDS: (keyof DeliveryReport)[] = [
  "alcance",
  "fueraDeAlcance",
  "archivosCreados",
  "archivosModificados",
  "riesgos",
  "qualityGates",
  "rutasVerificadas",
  "proximoPaso",
  "arquitecturaAfectada",
];

export function createDeliveryReport(partial: Partial<DeliveryReport>): DeliveryReport {
  const now = new Date().toISOString().slice(0, 10);

  return {
    programa: partial.programa ?? "",
    epica: partial.epica ?? "",
    release: partial.release ?? "",
    objetivo: partial.objetivo ?? "",
    alcance: partial.alcance ?? [],
    fueraDeAlcance: partial.fueraDeAlcance ?? [],
    archivosCreados: partial.archivosCreados ?? [],
    archivosModificados: partial.archivosModificados ?? [],
    riesgos: partial.riesgos ?? [],
    qualityGates: partial.qualityGates ?? [],
    resultadoBuild: partial.resultadoBuild ?? "",
    rutasVerificadas: partial.rutasVerificadas ?? [],
    rollbackPlan: partial.rollbackPlan ?? "",
    proximoPaso: partial.proximoPaso ?? [],
    arquitecturaAfectada: partial.arquitecturaAfectada ?? [],
    compatibilidad: partial.compatibilidad ?? "",
    fecha: partial.fecha ?? now,
    autor: partial.autor,
  };
}

export function validateDeliveryReport(report: DeliveryReport): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = report[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`Campo requerido vacío: ${field}`);
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    const value = report[field];
    if (!Array.isArray(value)) {
      errors.push(`Campo debe ser array: ${field}`);
    }
  }

  if (report.archivosCreados.length === 0 && report.archivosModificados.length === 0) {
    errors.push("Debe listar al menos un archivo creado o modificado");
  }

  const failedGates = report.qualityGates.filter((gate) => !gate.passed);
  if (failedGates.length > 0) {
    errors.push(
      `Quality gates fallidos: ${failedGates.map((gate) => gate.id).join(", ")}`,
    );
  }

  if (report.rutasVerificadas.length === 0) {
    errors.push("Debe documentar rutas verificadas (HTTP 200)");
  }

  if (report.riesgos.length === 0) {
    errors.push("Debe documentar al menos un riesgo (o 'Sin riesgos identificados')");
  }

  return errors;
}

function formatGateResults(gates: QualityGateResult[]): string {
  if (gates.length === 0) {
    return "_Sin gates registrados_";
  }
  return gates
    .map((gate) => `- **${gate.id}**: ${gate.passed ? "PASS" : "FAIL"} — ${gate.message}`)
    .join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "_Ninguno_";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatDeliveryReportMarkdown(report: DeliveryReport): string {
  const lines: string[] = [
    `# Informe de entrega — ${report.epica}`,
    "",
    `**Fecha:** ${report.fecha ?? "—"}  `,
    `**Autor:** ${report.autor ?? "—"}`,
    "",
    "## Programa",
    report.programa,
    "",
    "## Épica",
    report.epica,
    "",
    "## Release",
    report.release,
    "",
    "## Objetivo",
    report.objetivo,
    "",
    "## Alcance",
    formatList(report.alcance),
    "",
    "## Fuera de alcance",
    formatList(report.fueraDeAlcance),
    "",
    "## Archivos creados",
    formatList(report.archivosCreados),
    "",
    "## Archivos modificados",
    formatList(report.archivosModificados),
    "",
    "## Arquitectura afectada",
    formatList(report.arquitecturaAfectada),
    "",
    "## Riesgos",
    formatList(report.riesgos),
    "",
    "## Quality gates",
    formatGateResults(report.qualityGates),
    "",
    "## Resultado build",
    "```",
    report.resultadoBuild,
    "```",
    "",
    "## Rutas verificadas",
    formatList(report.rutasVerificadas),
    "",
    "## Plan de rollback",
    report.rollbackPlan,
    "",
    "## Compatibilidad",
    report.compatibilidad,
    "",
    "## Próximo paso",
    formatList(report.proximoPaso),
  ];

  return lines.join("\n");
}
