import type { ProjectBundle } from "./types";
import { buildBundleMarkdown } from "./document-builder";

export function exportProjectMarkdown(bundle: ProjectBundle): string {
  return buildBundleMarkdown(bundle);
}

export function exportDeliverableMarkdown(bundle: ProjectBundle, deliverableId: string): string | null {
  for (const doc of bundle.documents) {
    const deliverable = doc.deliverables.find((d) => d.id === deliverableId);
    if (deliverable) {
      return `# ${deliverable.title}\n\n${deliverable.content}\n`;
    }
  }
  return null;
}
