/** Thin adapter — Website Factory public API. */

export interface WebsiteMissionResult {
  projectId: string;
  href: string;
}

export async function createWebsiteMission(idea: string): Promise<WebsiteMissionResult> {
  const { createWebsiteProject } = await import("@/lib/website-factory");
  const project = createWebsiteProject({
    name: idea.slice(0, 40) || "Mi Sitio Web",
    templateId: "landing-saas",
    idea: { title: idea, description: idea, audience: "general" },
  });
  return { projectId: project.id, href: `/website-factory/${project.id}` };
}

export async function runWebsiteStep(projectId: string): Promise<{ ok: boolean }> {
  const { runPipelineStep } = await import("@/lib/website-factory");
  runPipelineStep(projectId, "idea");
  return { ok: true };
}
