/** PROGRAM 5360 — Real Code Generation public API. */

export type * from "./types";
export { CODE_GENERATION_VERSION } from "./types";
export {
  slugify,
  computeChecksum,
  createProjectId,
  buildCodeFile,
  createEmptyCodeProject,
  toFileMetadata,
  bumpProjectVersion,
} from "./code-project";

export {
  generateCodeProject,
  generateAllProjectsForMission,
  generateFromCreationOutput,
  loadEngineContext,
  mapOutputTypeToProjectType,
} from "./code-generation-engine";

export { validateCodeProject, applyValidationToProject } from "./code-validator";
export { createNewCodeVersion, compareCodeVersions, diffFileContent } from "./code-versioning";
export {
  getCodeRepository,
  seedCodeProjects,
  resetCodeRepository,
  persistToLocalStorage,
  loadFromLocalStorage,
} from "./code-repository";

export { applyCodeChangeRequest } from "./change-requests";

export {
  runNexoraFieldCodeE2EPipeline,
  runGenericFixtureValidation,
  loadCodeProjectsForMission,
  getCodeStudioHref,
  CODE_E2E_MISSION_ID,
} from "./e2e-nexora-pipeline";

export { exportProjectAsZip, exportProjectAsZipBuffer, isValidZipBuffer } from "./export/code-zip-exporter";
export {
  buildExportManifest,
  exportManifestJson,
  exportManifestMarkdown,
  formatManifestMarkdown,
} from "./export/code-manifest-exporter";

export { getAllTemplates, getTemplateById, getTemplateForProjectType } from "./templates/loader";
export { validateCodeSecurity } from "./security/code-security-validator";
export { outputTypeToKind } from "./kind-map";
export { loadCodeProject, loadNexoraCodeProjects, loadCodeProjectFromOutput } from "./project-loader";
export { buildLegacyManifest, withLegacyManifest } from "./legacy-adapter";

export async function loadCodeStudioServer(missionId: string, ventureSlug?: string) {
  const { loadCodeProjectsForMission } = await import("./e2e-nexora-pipeline");
  const { getCodeRepository } = await import("./code-repository");
  const projects = await loadCodeProjectsForMission(missionId, ventureSlug);
  return {
    missionId,
    ventureSlug,
    projects: projects.map((p) => {
      const repo = getCodeRepository();
      const meta = repo.getProjectMetadata(p.projectId, 1, 100);
      return meta ?? { project: { ...p, files: p.files.map((f) => ({
        path: f.path,
        language: f.language,
        purpose: f.purpose,
        generatedBy: f.generatedBy,
        checksum: f.checksum,
        editable: f.editable,
        status: f.status,
        sizeBytes: f.sizeBytes ?? f.content.length,
        sourceArtifactIds: f.sourceArtifactIds,
      })) }, totalFiles: p.files.length, page: 1, pageSize: 100, hasMore: false };
    }),
    summaries: getCodeRepository().listSummaries(missionId),
  };
}
