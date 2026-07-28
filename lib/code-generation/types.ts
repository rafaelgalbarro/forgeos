/** PROGRAM 5360 — Real Code Generation contract. */

export const CODE_GENERATION_VERSION = "PROGRAM 5360 — REAL CODE GENERATION";

export type CodeProjectType =
  | "website"
  | "web_application"
  | "mobile"
  | "backend"
  | "fullstack";

/** @deprecated Use CodeProjectType */
export type CodeProjectKind = "website" | "webapp" | "backend" | "mobile" | "deployment";

export type CodeProjectStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "VALIDATING"
  | "INVALID"
  | "READY_FOR_PREVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "FAILED";

export type CodeFileStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "VALIDATING"
  | "INVALID"
  | "READY_FOR_PREVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "FAILED";

export type StaticValidationResult = "STATIC_VALIDATION_PASSED" | "STATIC_VALIDATION_FAILED";

export type GenerationMode = "template" | "ai";

export interface CodeFile {
  path: string;
  language: string;
  content: string;
  purpose: string;
  generatedBy: GenerationMode;
  sourceArtifactIds: string[];
  checksum: string;
  editable: boolean;
  status: CodeFileStatus;
  sizeBytes?: number;
  /** @deprecated legacy scaffold field */
  kind?: "file" | "directory";
}

export interface CodeDirectory {
  path: string;
  purpose?: string;
}

export interface CodeDependency {
  name: string;
  version: string;
  dev?: boolean;
}

export interface CodeScript {
  name: string;
  command: string;
  purpose?: string;
}

export interface CodeEnvironmentVariable {
  key: string;
  description: string;
  example: string;
  required: boolean;
  secret?: boolean;
}

export interface CodeRoute {
  id: string;
  path: string;
  label: string;
  file?: string;
  auth?: boolean;
}

export interface CodeDatabaseSpec {
  provider: string;
  migrations: string[];
  seedFiles: string[];
  schemaFiles: string[];
}

export interface CodeApiSpec {
  basePath: string;
  endpoints: { method: string; path: string; handler: string; description: string }[];
}

export interface CodeTestSpec {
  framework: string;
  files: string[];
  coverage?: string;
}

export interface CodeDocumentation {
  readme: string;
  envExample: string;
  apiDocs?: string;
}

export interface CodeWarning {
  id: string;
  severity: "info" | "warn" | "error";
  message: string;
  filePath?: string;
  code?: string;
}

export interface CodeValidation {
  result: StaticValidationResult;
  passed: boolean;
  score: number;
  checks: {
    id: string;
    label: string;
    status: "pass" | "fail" | "warn" | "skip";
    detail?: string;
  }[];
  validatedAt: string;
}

export interface CodeProject {
  projectId: string;
  missionId: string;
  ventureId?: string;
  outputId?: string;
  projectType: CodeProjectType;
  name: string;
  slug: string;
  version: string;
  framework: string;
  language: string;
  packageManager: "npm" | "pnpm" | "yarn";
  files: CodeFile[];
  directories: CodeDirectory[];
  dependencies: CodeDependency[];
  scripts: CodeScript[];
  environmentVariables: CodeEnvironmentVariable[];
  routes: CodeRoute[];
  database?: CodeDatabaseSpec;
  api?: CodeApiSpec;
  tests?: CodeTestSpec;
  documentation: CodeDocumentation;
  warnings: CodeWarning[];
  validation?: CodeValidation;
  status: CodeProjectStatus;
  templateId: string;
  generationMode: GenerationMode;
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
  generatedAt?: string;
  generationDurationMs?: number;
  /** Legacy manifest for preview-runtime (5370) compatibility */
  manifest?: import("./legacy-adapter").CodeProjectLegacyManifest;
}

export interface CodeProjectSummary {
  projectId: string;
  missionId: string;
  name: string;
  slug: string;
  projectType: CodeProjectType;
  version: string;
  status: CodeProjectStatus;
  fileCount: number;
  validation?: StaticValidationResult;
  templateId: string;
  generationMode: GenerationMode;
  updatedAt: string;
}

export interface CodeFileMetadata {
  path: string;
  language: string;
  purpose: string;
  generatedBy: GenerationMode;
  checksum: string;
  editable: boolean;
  status: CodeFileStatus;
  sizeBytes: number;
  sourceArtifactIds: string[];
}

export interface CodeProjectMetadata {
  project: Omit<CodeProject, "files"> & { files: CodeFileMetadata[] };
  totalFiles: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CodeGenerationInput {
  missionId: string;
  ventureId?: string;
  ventureName: string;
  ventureSlug?: string;
  ideaText: string;
  outputId?: string;
  projectType: CodeProjectType;
  modules?: string[];
  sourceArtifactIds?: string[];
}

export interface CodeGenerationResult {
  project: CodeProject;
  mode: GenerationMode;
  durationMs: number;
  warnings: CodeWarning[];
}

export interface CodeVersionComparison {
  projectId: string;
  versionA: string;
  versionB: string;
  affectedFiles: string[];
  addedFiles: string[];
  removedFiles: string[];
  changedFiles: string[];
  validationBefore?: StaticValidationResult;
  validationAfter?: StaticValidationResult;
}

export interface CodeExportManifest {
  projectId: string;
  projectName: string;
  slug: string;
  version: string;
  templateId: string;
  framework: string;
  fileCount: number;
  totalBytes: number;
  validation: StaticValidationResult;
  generatedAt: string;
  files: { path: string; sizeBytes: number; checksum: string; language: string }[];
  warnings: CodeWarning[];
  generationMode: GenerationMode;
}

/** @deprecated legacy loader request */
export interface CodeProjectLoadRequest {
  missionId: string;
  outputId?: string;
  factoryProjectId?: string;
  kind?: CodeProjectKind;
}

export function kindToProjectType(kind: CodeProjectKind): CodeProjectType | null {
  const map: Record<string, CodeProjectType> = {
    website: "website",
    webapp: "web_application",
    mobile: "mobile",
    backend: "backend",
    deployment: "backend",
  };
  return map[kind] ?? null;
}
