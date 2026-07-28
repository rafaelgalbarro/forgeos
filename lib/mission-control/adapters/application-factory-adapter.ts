/** Thin adapter — Application Factory public API. */

export interface ApplicationMissionResult {
  projectId: string;
  href: string;
}

export async function createApplicationMission(idea: string): Promise<ApplicationMissionResult> {
  const { createAppProject } = await import("@/lib/application-factory");
  const project = createAppProject(idea, idea.slice(0, 40));
  return { projectId: project.id, href: `/application-factory/${project.id}` };
}

export async function runApplicationStep(projectId: string): Promise<{ ok: boolean }> {
  const { getProjectById, runPipelineStep } = await import("@/lib/application-factory");
  const project = getProjectById(projectId);
  if (!project) return { ok: false };
  await runPipelineStep(project);
  return { ok: true };
}
