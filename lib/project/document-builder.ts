import type { ProjectBundle, ProjectDeliverable } from "./types";

export function buildDocumentMarkdown(deliverable: ProjectDeliverable): string {
  if (deliverable.format === "code") {
    return `# ${deliverable.title}\n\n\`\`\`\n${deliverable.content}\n\`\`\`\n`;
  }
  return `# ${deliverable.title}\n\n${deliverable.content}\n`;
}

export function buildBundleMarkdown(bundle: ProjectBundle): string {
  const parts = [`# ${bundle.projectName}`, "", `Generado: ${bundle.generatedAt}`, ""];
  for (const doc of bundle.documents) {
    parts.push(`## ${doc.title}`, "");
    for (const deliverable of doc.deliverables) {
      parts.push(buildDocumentMarkdown(deliverable));
    }
  }
  return parts.join("\n");
}
