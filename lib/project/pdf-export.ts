import type { ProjectBundle } from "./types";
import { buildBundleMarkdown } from "./document-builder";

/** PDF export structure — rendering deferred to future sprint. */
export interface PDFExportPlan {
  filename: string;
  title: string;
  sections: { heading: string; body: string }[];
  generatedAt: string;
  markdownLength: number;
}

export function planPDFExport(bundle: ProjectBundle): PDFExportPlan {
  const markdown = buildBundleMarkdown(bundle);
  return {
    filename: `${bundle.projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    title: bundle.projectName,
    sections: bundle.documents.flatMap((doc) =>
      doc.deliverables.map((d) => ({
        heading: d.title,
        body: d.content,
      }))
    ),
    generatedAt: bundle.generatedAt,
    markdownLength: markdown.length,
  };
}

export async function exportProjectPDF(_bundle: ProjectBundle): Promise<Blob | null> {
  /* Placeholder: integrate pdfkit or browser print API in future sprint. */
  return null;
}
