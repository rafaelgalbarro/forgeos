/** PROGRAM 5360 — Template manifest contract. */

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
  projectType: "website" | "web_application" | "mobile" | "backend" | "fullstack";
  stack: {
    framework: string;
    language: string;
    styling?: string;
    database?: string;
    auth?: string;
    mobile?: string;
  };
  structure: string[];
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
  envVars: { key: string; description: string; example: string; required: boolean; secret?: boolean }[];
  conventions: {
    appDir?: string;
    componentsDir?: string;
    libDir?: string;
    testsDir?: string;
    naming: string;
  };
  generator: string;
}

export interface TemplateContext {
  name: string;
  slug: string;
  ventureName: string;
  ideaText: string;
  modules: string[];
  brandColor?: string;
  tagline?: string;
  sourceArtifactIds: string[];
}
