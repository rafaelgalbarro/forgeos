/** PROGRAM 4400 — Website Factory pipeline runner with localStorage persistence. */

import type {
  PipelineRunResult,
  WebsiteBrand,
  WebsiteIdea,
  WebsitePage,
  WebsiteProject,
  WizardStepId,
} from "./types";
import {
  computeWizardProgress,
  createInitialSteps,
  getNextStepId,
  markStepCompleted,
  WIZARD_STEPS,
} from "./wizard";
import { getTemplateById } from "./templates";
import { generateExportBundle } from "./export";
import { createInitialBuildStatus, syncBuildStatusFromProject } from "./build-status";
import { createDemoWebsiteProject, DEMO_PROJECT_ID } from "./fixtures/demo-project";

const STORAGE_KEY = "forgeos-website-factory-projects";

function generateId(): string {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readAllProjects(): WebsiteProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WebsiteProject[];
  } catch {
    return [];
  }
}

export function writeAllProjects(projects: WebsiteProject[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjectById(id: string): WebsiteProject | undefined {
  return readAllProjects().find((p) => p.id === id);
}

export function saveProject(project: WebsiteProject): WebsiteProject {
  const projects = readAllProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };
  if (idx >= 0) projects[idx] = updated;
  else projects.unshift(updated);
  writeAllProjects(projects);
  return updated;
}

export function deleteProject(id: string): void {
  writeAllProjects(readAllProjects().filter((p) => p.id !== id));
}

export function ensureDemoProjectSeeded(): WebsiteProject {
  const existing = getProjectById(DEMO_PROJECT_ID);
  if (existing) return existing;
  const demo = createDemoWebsiteProject();
  return saveProject(demo);
}

export interface CreateProjectInput {
  name: string;
  templateId: string;
  idea?: Partial<WebsiteIdea>;
}

export function createWebsiteProject(input: CreateProjectInput): WebsiteProject {
  const template = getTemplateById(input.templateId);
  const now = new Date().toISOString();
  const pages: WebsitePage[] = (template?.defaultPages ?? ["home"]).map((slug) => ({
    slug,
    title: slug.charAt(0).toUpperCase() + slug.slice(1),
    purpose: `Página ${slug}`,
    sections: template?.suggestedComponents.slice(0, 3) ?? ["Hero", "Content"],
  }));

  const project: WebsiteProject = {
    id: generateId(),
    name: input.name,
    templateId: input.templateId,
    idea: {
      title: input.idea?.title ?? input.name,
      description: input.idea?.description ?? "",
      audience: input.idea?.audience ?? "",
      goals: input.idea?.goals ?? [],
    },
    brand: {
      primaryColor: "#2563eb",
      secondaryColor: "#7c3aed",
      fontFamily: "Inter",
      tone: "Profesional",
      tagline: "",
    },
    pages,
    copyBlocks: {},
    seo: { title: input.name, description: "", keywords: [] },
    components: template?.suggestedComponents ?? [],
    currentStepId: "idea",
    steps: createInitialSteps("idea"),
    buildStatus: createInitialBuildStatus(""),
    exportBundle: null,
    createdAt: now,
    updatedAt: now,
  };
  project.buildStatus = createInitialBuildStatus(project.id);
  return saveProject(project);
}

function runStepLogic(project: WebsiteProject, stepId: WizardStepId): { summary: string; patch: Partial<WebsiteProject> } {
  const template = getTemplateById(project.templateId);

  switch (stepId) {
    case "idea":
      return {
        summary: project.idea.description || "Idea capturada",
        patch: {},
      };
    case "research":
      return {
        summary: `Audiencia: ${project.idea.audience || "General"}. Mercado analizado (heurístico).`,
        patch: {},
      };
    case "brand":
      return {
        summary: `${project.brand.tone} — ${project.brand.primaryColor}`,
        patch: {
          brand: {
            ...project.brand,
            tagline: project.brand.tagline || `Bienvenido a ${project.name}`,
          },
        },
      };
    case "copywriting": {
      const copyBlocks: Record<string, string> = { ...project.copyBlocks };
      for (const page of project.pages) {
        for (const section of page.sections) {
          if (!copyBlocks[section]) {
            copyBlocks[section] = `Contenido para ${section} — ${project.idea.title}`;
          }
        }
      }
      return { summary: `${Object.keys(copyBlocks).length} bloques de copy generados`, patch: { copyBlocks } };
    }
    case "seo":
      return {
        summary: project.seo.description || "Metadata SEO configurada",
        patch: {
          seo: {
            title: project.seo.title || project.name,
            description: project.seo.description || project.idea.description.slice(0, 160),
            keywords: project.seo.keywords.length ? project.seo.keywords : [project.name.toLowerCase()],
          },
        },
      };
    case "page-architecture":
      return {
        summary: `${project.pages.length} páginas: ${project.pages.map((p) => p.slug).join(", ")}`,
        patch: {},
      };
    case "components":
      return {
        summary: `${project.components.length} componentes (${template?.suggestedComponents.join(", ") ?? "base"})`,
        patch: {},
      };
    case "nextjs":
      return { summary: "Scaffold Next.js App Router preparado", patch: {} };
    case "tailwind":
      return { summary: `Tokens Tailwind: ${project.brand.primaryColor}`, patch: {} };
    case "shadcn":
      return { summary: "shadcn/ui: Button, Card, Badge", patch: {} };
    case "preview":
      return { summary: "Preview HTML generado", patch: {} };
    case "github":
      return {
        summary: "Repositorio GitHub — stub dry-run (conectar Real Build Flow)",
        patch: {},
      };
    case "deploy-preview":
      return {
        summary: "Deploy Preview — stub Vercel (ver /cloud cuando esté disponible)",
        patch: {},
      };
    default:
      return { summary: "Etapa completada", patch: {} };
  }
}

export function runPipelineStep(projectId: string, stepId: WizardStepId): PipelineRunResult {
  const project = getProjectById(projectId);
  if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);

  const { summary, patch } = runStepLogic(project, stepId);
  const steps = markStepCompleted(project.steps, stepId, summary);
  const nextId = getNextStepId(stepId) ?? stepId;

  let updated: WebsiteProject = {
    ...project,
    ...patch,
    steps,
    currentStepId: nextId,
  };

  if (stepId === "preview" || stepId === "deploy-preview") {
    updated.exportBundle = generateExportBundle(updated);
  }

  updated.buildStatus = syncBuildStatusFromProject(updated);
  updated = saveProject(updated);

  return {
    project: updated,
    progress: computeWizardProgress(updated.steps, updated.currentStepId),
    ranStepId: stepId,
  };
}

export function runFullPipeline(projectId: string): WebsiteProject {
  let project = getProjectById(projectId);
  if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);

  for (const step of WIZARD_STEPS) {
    if (project.steps.find((s) => s.id === step.id)?.status === "completed") continue;
    const result = runPipelineStep(projectId, step.id);
    project = result.project;
  }
  return project;
}

export function updateProjectIdea(projectId: string, idea: Partial<WebsiteIdea>): WebsiteProject {
  const project = getProjectById(projectId);
  if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);
  return saveProject({ ...project, idea: { ...project.idea, ...idea } });
}

export function updateProjectBrand(projectId: string, brand: Partial<WebsiteBrand>): WebsiteProject {
  const project = getProjectById(projectId);
  if (!project) throw new Error(`Proyecto no encontrado: ${projectId}`);
  return saveProject({ ...project, brand: { ...project.brand, ...brand } });
}

export function listProjects(): WebsiteProject[] {
  const projects = readAllProjects();
  if (projects.length === 0 && isBrowser()) {
    return [ensureDemoProjectSeeded()];
  }
  return projects;
}
