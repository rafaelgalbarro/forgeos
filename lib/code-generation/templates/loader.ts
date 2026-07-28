/** PROGRAM 5360 — Template manifest loader. */

import type { TemplateManifest } from "./types";
import websiteManifest from "./website-nextjs/manifest.json";
import webappManifest from "./webapp-nextjs-supabase/manifest.json";
import mobileManifest from "./mobile-expo/manifest.json";
import backendManifest from "./backend-node-api/manifest.json";
import fullstackManifest from "./fullstack-nextjs-supabase/manifest.json";

const TEMPLATES: TemplateManifest[] = [
  websiteManifest as TemplateManifest,
  webappManifest as TemplateManifest,
  mobileManifest as TemplateManifest,
  backendManifest as TemplateManifest,
  fullstackManifest as TemplateManifest,
];

export function getAllTemplates(): TemplateManifest[] {
  return [...TEMPLATES];
}

export function getTemplateById(id: string): TemplateManifest | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplateForProjectType(
  projectType: TemplateManifest["projectType"]
): TemplateManifest {
  const found = TEMPLATES.find((t) => t.projectType === projectType);
  if (!found) throw new Error(`No template for project type: ${projectType}`);
  return found;
}

export function selectTemplateId(projectType: string): string {
  const map: Record<string, string> = {
    website: "website-nextjs",
    web_application: "webapp-nextjs-supabase",
    mobile: "mobile-expo",
    backend: "backend-node-api",
    fullstack: "fullstack-nextjs-supabase",
  };
  return map[projectType] ?? "website-nextjs";
}
