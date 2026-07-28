/** Thin adapter — Mobile Factory public API. */

export interface MobileMissionResult {
  projectId: string;
  href: string;
}

export async function createMobileMission(idea: string): Promise<MobileMissionResult> {
  const { createMobileProject } = await import("@/lib/mobile-factory");
  const project = createMobileProject(idea, idea.slice(0, 40));
  return { projectId: project.id, href: `/mobile-factory/${project.id}` };
}

export async function runMobileStep(projectId: string): Promise<{ ok: boolean }> {
  const { getProjectById, runPipelineStep } = await import("@/lib/mobile-factory");
  const project = getProjectById(projectId);
  if (!project) return { ok: false };
  await runPipelineStep(project);
  return { ok: true };
}
