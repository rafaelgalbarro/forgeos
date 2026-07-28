/** PROGRAM 5360 — CodeProject factory and helpers. */

import type {
  CodeFile,
  CodeProject,
  CodeProjectStatus,
  CodeProjectType,
  GenerationMode,
} from "./types";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `fnv1a-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export function createProjectId(type: CodeProjectType): string {
  return `code-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function inferLanguage(path: string): string {
  if (path.endsWith(".tsx")) return "typescriptreact";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascriptreact";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".env.example")) return "plaintext";
  return "plaintext";
}

export function buildCodeFile(
  path: string,
  content: string,
  purpose: string,
  options: {
    generatedBy?: GenerationMode;
    sourceArtifactIds?: string[];
    editable?: boolean;
    status?: CodeFile["status"];
  } = {}
): CodeFile {
  return {
    path,
    language: inferLanguage(path),
    content,
    purpose,
    generatedBy: options.generatedBy ?? "template",
    sourceArtifactIds: options.sourceArtifactIds ?? [],
    checksum: computeChecksum(content),
    editable: options.editable ?? true,
    status: options.status ?? "GENERATED",
    sizeBytes: new TextEncoder().encode(content).length,
  };
}

export function createEmptyCodeProject(input: {
  missionId: string;
  ventureId?: string;
  outputId?: string;
  projectType: CodeProjectType;
  name: string;
  templateId: string;
  framework?: string;
  language?: string;
}): CodeProject {
  const now = new Date().toISOString();
  const slug = slugify(input.name);

  return {
    projectId: createProjectId(input.projectType),
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    projectType: input.projectType,
    name: input.name,
    slug,
    version: "1.0.0",
    framework: input.framework ?? "unknown",
    language: input.language ?? "typescript",
    packageManager: "npm",
    files: [],
    directories: [],
    dependencies: [],
    scripts: [],
    environmentVariables: [],
    routes: [],
    documentation: { readme: "", envExample: "" },
    warnings: [],
    status: "DRAFT" as CodeProjectStatus,
    templateId: input.templateId,
    generationMode: "template",
    createdAt: now,
    updatedAt: now,
  };
}

export function extractDirectories(files: CodeFile[]): CodeProject["directories"] {
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }
  return Array.from(dirs)
    .sort()
    .map((path) => ({ path }));
}

export function bumpProjectVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return "1.0.1";
}

export function toFileMetadata(file: CodeFile) {
  return {
    path: file.path,
    language: file.language,
    purpose: file.purpose,
    generatedBy: file.generatedBy,
    checksum: file.checksum,
    editable: file.editable,
    status: file.status,
    sizeBytes: file.sizeBytes ?? new TextEncoder().encode(file.content).length,
    sourceArtifactIds: file.sourceArtifactIds,
  };
}
