/** PROGRAM 5360 — Change request integration for code projects. */

import type { CodeProject, CodeWarning } from "./types";
import { createNewCodeVersion, compareCodeVersions } from "./code-versioning";
import { applyValidationToProject } from "./code-validator";
import { getCodeRepository } from "./code-repository";
import type { ChangeRequest } from "@/lib/creation-output/types";

export interface CodeChangeRequestResult {
  changeRequest: ChangeRequest;
  newProject: CodeProject;
  comparison: ReturnType<typeof compareCodeVersions>;
}

export function applyCodeChangeRequest(
  project: CodeProject,
  description: string,
  affectedFilePaths: string[]
): CodeChangeRequestResult {
  const warning: CodeWarning = {
    id: `cr-${Date.now()}`,
    severity: "info",
    message: `Change request: ${description.slice(0, 120)}`,
    code: "CHANGE_REQUEST",
  };

  const updatedFiles = project.files.map((f) => {
    if (!affectedFilePaths.includes(f.path)) return f;
    return {
      ...f,
      content: f.content + `\n// Change requested: ${description.slice(0, 80)}\n`,
      status: "CHANGES_REQUESTED" as const,
    };
  });

  let newProject = createNewCodeVersion(project, {
    files: updatedFiles,
    warnings: [...project.warnings, warning],
    status: "CHANGES_REQUESTED",
  });

  newProject = applyValidationToProject(newProject);
  getCodeRepository().save(newProject);

  const comparison = compareCodeVersions(project, newProject);

  const changeRequest: ChangeRequest = {
    id: `cr-code-${Date.now().toString(36)}`,
    missionId: project.missionId,
    outputId: project.outputId ?? project.projectId,
    outputType: mapProjectTypeToOutputType(project.projectType),
    description,
    affectedAreas: affectedFilePaths,
    status: "open",
    createdAt: new Date().toISOString(),
    newVersionId: newProject.projectId,
    previousVersionId: project.projectId,
  };

  return { changeRequest, newProject, comparison };
}

function mapProjectTypeToOutputType(
  type: CodeProject["projectType"]
): ChangeRequest["outputType"] {
  const map: Record<CodeProject["projectType"], ChangeRequest["outputType"]> = {
    website: "WEBSITE_OUTPUT",
    web_application: "WEB_APPLICATION_OUTPUT",
    mobile: "MOBILE_APPLICATION_OUTPUT",
    backend: "BACKEND_OUTPUT",
    fullstack: "WEB_APPLICATION_OUTPUT",
  };
  return map[type];
}
