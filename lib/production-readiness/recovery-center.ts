/** Program 6500 — Recovery procedures stub */

import type { RecoveryProcedure } from "./types";

const STUB_PROCEDURES: RecoveryProcedure[] = [
  {
    id: "restart-workers",
    title: "Reiniciar workers",
    description: "Reinicia el pool de workers del runtime (dry-run).",
    steps: [
      "Verificar cola de tareas pendientes",
      "Drenar workers activos",
      "Reiniciar pool de workers",
      "Validar health probes",
    ],
    automated: false,
    status: "ready",
  },
  {
    id: "clear-dead-letter",
    title: "Limpiar dead-letter queue",
    description: "Reintenta o descarta tareas en dead-letter (stub).",
    steps: ["Listar tareas en DLQ", "Clasificar por tipo", "Reintentar o descartar"],
    automated: true,
    status: "ready",
  },
  {
    id: "ai-fallback",
    title: "Activar fallback AI",
    description: "Cambia a proveedor de respaldo vía router público.",
    steps: ["Verificar cadena de fallback", "Forzar proveedor secundario", "Monitorizar latencia"],
    automated: false,
    status: "ready",
  },
];

export function listRecoveryProcedures(): RecoveryProcedure[] {
  return STUB_PROCEDURES;
}

export function getRecoveryProcedure(id: string): RecoveryProcedure | null {
  return STUB_PROCEDURES.find((p) => p.id === id) ?? null;
}

export async function runRecoveryProcedure(id: string): Promise<RecoveryProcedure> {
  const proc = getRecoveryProcedure(id);
  if (!proc) throw new Error(`Procedimiento no encontrado: ${id}`);

  return {
    ...proc,
    status: "completed",
    lastRunAt: new Date().toISOString(),
  };
}
