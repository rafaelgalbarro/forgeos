/** PROGRAM 5350 — Change request handling. */

import type { ChangeRequest, CreationOutput } from "./types";
import { getOutputRepository } from "./output-repository";
import { createNewVersion } from "./output-versioning";
import { applyValidation } from "./output-validator";
import { registerOutput } from "./output-registry";

function generateId(): string {
  return `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChangeRequest(
  output: CreationOutput,
  description: string,
  affectedAreas: string[]
): { changeRequest: ChangeRequest; newVersion: CreationOutput } {
  if (output.status === "APPROVED") {
    const newVersion = createNewVersion(output, {
      status: "CHANGES_REQUESTED",
      title: output.title,
      warnings: [
        ...output.warnings,
        {
          id: `warn-cr-${Date.now()}`,
          severity: "info",
          message: `Cambios solicitados: ${description.slice(0, 80)}`,
          code: "CHANGE_REQUEST",
        },
      ],
    });

    const validated = applyValidation({
      ...newVersion,
      status: "CHANGES_REQUESTED",
    });
    registerOutput(validated);

    const changeRequest: ChangeRequest = {
      id: generateId(),
      missionId: output.missionId,
      outputId: validated.outputId,
      outputType: output.type,
      description,
      affectedAreas,
      status: "open",
      createdAt: new Date().toISOString(),
      newVersionId: validated.outputId,
      previousVersionId: output.outputId,
    };

    getOutputRepository().saveChangeRequest(changeRequest);
    return { changeRequest, newVersion: validated };
  }

  const updated: CreationOutput = {
    ...output,
    status: "CHANGES_REQUESTED",
    updatedAt: new Date().toISOString(),
    warnings: [
      ...output.warnings,
      {
        id: `warn-cr-${Date.now()}`,
        severity: "info",
        message: description.slice(0, 120),
        code: "CHANGE_REQUEST",
      },
    ],
  };
  registerOutput(updated);

  const changeRequest: ChangeRequest = {
    id: generateId(),
    missionId: output.missionId,
    outputId: output.outputId,
    outputType: output.type,
    description,
    affectedAreas,
    status: "open",
    createdAt: new Date().toISOString(),
    previousVersionId: output.outputId,
  };

  getOutputRepository().saveChangeRequest(changeRequest);
  return { changeRequest, newVersion: updated };
}

export function approveOutput(output: CreationOutput, reviewer = "founder"): CreationOutput {
  const approved: CreationOutput = {
    ...output,
    status: "APPROVED",
    updatedAt: new Date().toISOString(),
    approvals: [
      ...output.approvals,
      {
        id: `appr-${Date.now()}`,
        status: "approved",
        requestedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        reviewer,
        note: "Aprobado en Output Studio",
      },
    ],
    nextActions: output.nextActions.filter((a) => a.kind !== "approve"),
  };
  registerOutput(approved);
  return approved;
}

export function getOpenChangeRequests(missionId: string): ChangeRequest[] {
  return getOutputRepository()
    .getChangeRequests(missionId)
    .filter((cr) => cr.status === "open" || cr.status === "in_progress");
}
