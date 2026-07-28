/** PROGRAM 4400 — Website Preview generator (HTML structure, no heavy runtime). */

import type { WebsiteBrand, WebsitePage, WebsiteProject } from "./types";
import { getTemplateById } from "./templates";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(section: string, copy: string, brand: WebsiteBrand): string {
  const heading = escapeHtml(section);
  const body = escapeHtml(copy || `Contenido de ${section}`);
  return `
    <section class="wf-section" data-section="${heading.toLowerCase()}">
      <h2 style="color:${brand.primaryColor}">${heading}</h2>
      <p>${body}</p>
    </section>`;
}

function renderPage(page: WebsitePage, project: WebsiteProject): string {
  const brand = project.brand;
  const sections = page.sections
    .map((s) => renderSection(s, project.copyBlocks[s] ?? project.copyBlocks.hero ?? "", brand))
    .join("\n");

  return `
    <article class="wf-page" data-slug="${page.slug}">
      <header class="wf-page-header">
        <h1>${escapeHtml(page.title)}</h1>
        <p class="wf-muted">${escapeHtml(page.purpose)}</p>
      </header>
      ${sections}
    </article>`;
}

export interface WebsitePreviewDocument {
  html: string;
  title: string;
  pageCount: number;
  componentCount: number;
}

export function generateWebsitePreview(project: WebsiteProject): WebsitePreviewDocument {
  const template = getTemplateById(project.templateId);
  const pages = project.pages.length > 0 ? project.pages : [{ slug: "home", title: project.name, purpose: project.idea.description, sections: ["Hero", "Features", "CTA"] }];
  const nav = pages
    .map((p) => `<a href="#${p.slug}" class="wf-nav-link">${escapeHtml(p.title)}</a>`)
    .join("");

  const pageHtml = pages.map((p) => renderPage(p, project)).join("\n<hr/>\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(project.seo.title || project.name)}</title>
  <meta name="description" content="${escapeHtml(project.seo.description)}"/>
  <style>
    :root {
      --wf-primary: ${project.brand.primaryColor};
      --wf-secondary: ${project.brand.secondaryColor};
      --wf-font: ${project.brand.fontFamily}, system-ui, sans-serif;
    }
    body { font-family: var(--wf-font); margin: 0; color: #1a1a1a; background: #fafafa; }
    .wf-header { background: var(--wf-primary); color: #fff; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .wf-nav { display: flex; gap: 1rem; }
    .wf-nav-link { color: #fff; text-decoration: none; opacity: 0.9; }
    .wf-hero { padding: 3rem 2rem; text-align: center; background: linear-gradient(135deg, var(--wf-primary), var(--wf-secondary)); color: #fff; }
    .wf-hero h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
    .wf-hero p { opacity: 0.9; max-width: 560px; margin: 0 auto; }
    .wf-main { max-width: 960px; margin: 0 auto; padding: 2rem; }
    .wf-section { margin: 2rem 0; padding: 1.5rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .wf-muted { color: #666; }
    .wf-footer { text-align: center; padding: 2rem; color: #888; font-size: 0.875rem; }
    .wf-tagline { font-style: italic; opacity: 0.85; }
  </style>
</head>
<body>
  <header class="wf-header">
    <strong>${escapeHtml(project.name)}</strong>
    <nav class="wf-nav">${nav}</nav>
  </header>
  <div class="wf-hero">
    <h1>${escapeHtml(project.idea.title || project.name)}</h1>
    <p class="wf-tagline">${escapeHtml(project.brand.tagline)}</p>
    <p>${escapeHtml(project.idea.description)}</p>
  </div>
  <main class="wf-main">
    ${pageHtml}
  </main>
  <footer class="wf-footer">
    ${escapeHtml(project.name)} · Template: ${escapeHtml(template?.name ?? project.templateId)} · ForgeOS Website Factory
  </footer>
</body>
</html>`;

  return {
    html,
    title: project.name,
    pageCount: pages.length,
    componentCount: project.components.length,
  };
}

export function generatePreviewSrcDoc(project: WebsiteProject): string {
  return generateWebsitePreview(project).html;
}
