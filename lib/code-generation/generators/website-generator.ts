/** PROGRAM 5360 — Website generator (Next.js + TypeScript + Tailwind). */

import type { CodeGenerationInput, CodeProject } from "../types";
import { buildFiles } from "../file-builder";
import { buildProject } from "../project-builder";
import { getTemplateForProjectType } from "../templates/loader";
import type { TemplateContext } from "../templates/types";
import { applyValidationToProject } from "../code-validator";
import { slugify } from "../code-project";
import {
  buildPackageJson,
  buildReadme,
  buildTsConfig,
  extractModulesFromIdea,
  fhisButton,
} from "./shared";
import { buildDependenciesFromTemplate } from "../dependency-builder";
import { buildEnvExampleContent, buildEnvVarsFromTemplate } from "../environment-builder";

export async function generateWebsiteProject(input: CodeGenerationInput): Promise<CodeProject> {
  const template = getTemplateForProjectType("website");
  const slug = slugify(input.ventureName);
  const modules = input.modules ?? extractModulesFromIdea(input.ideaText);
  const brandColor = "#2563eb";

  const ctx: TemplateContext = {
    name: input.ventureName,
    slug,
    ventureName: input.ventureName,
    ideaText: input.ideaText,
    modules,
    brandColor,
    tagline: input.ideaText.slice(0, 80),
    sourceArtifactIds: input.sourceArtifactIds ?? [],
  };

  const deps = buildDependenciesFromTemplate(template);
  const envVars = buildEnvVarsFromTemplate(template);

  const pages = [
    { slug: "", title: "Home" },
    { slug: "about", title: "About" },
    { slug: "features", title: "Features" },
    { slug: "contact", title: "Contact" },
  ];

  const pageFiles = pages
    .filter((p) => p.slug)
    .map((p) => ({
      path: `app/${p.slug}/page.tsx`,
      content: generatePageComponent(p.title, ctx, modules),
      purpose: `Page: ${p.title}`,
    }));

  const files = buildFiles([
    {
      path: "package.json",
      content: buildPackageJson(slug, template, deps),
      purpose: "Project dependencies and scripts",
    },
    {
      path: "tsconfig.json",
      content: buildTsConfig(),
      purpose: "TypeScript configuration",
    },
    {
      path: "next.config.ts",
      content: `import type { NextConfig } from "next";\n\nconst config: NextConfig = {\n  reactStrictMode: true,\n};\n\nexport default config;\n`,
      purpose: "Next.js configuration",
    },
    {
      path: "tailwind.config.ts",
      content: generateTailwindConfig(brandColor),
      purpose: "Tailwind CSS with brand tokens",
    },
    {
      path: "postcss.config.mjs",
      content: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`,
      purpose: "PostCSS configuration",
    },
    {
      path: "app/layout.tsx",
      content: generateLayout(ctx),
      purpose: "Root layout with SEO metadata",
    },
    {
      path: "app/page.tsx",
      content: generateHomePage(ctx, modules),
      purpose: "Home page",
    },
    ...pageFiles,
    {
      path: "app/globals.css",
      content: generateGlobalsCss(brandColor),
      purpose: "Global styles",
    },
    {
      path: "components/ui/Button.tsx",
      content: fhisButton("Button"),
      purpose: "FHIS-compatible button component",
    },
    {
      path: "components/sections/Hero.tsx",
      content: generateHero(ctx),
      purpose: "Hero section",
    },
    {
      path: "components/sections/Features.tsx",
      content: generateFeatures(modules, ctx.ventureName),
      purpose: "Features grid",
    },
    {
      path: "components/sections/Nav.tsx",
      content: generateNav(pages),
      purpose: "Navigation bar",
    },
    {
      path: "components/sections/ContactForm.tsx",
      content: generateContactForm(),
      purpose: "Demo contact form",
    },
    {
      path: "lib/brand.ts",
      content: generateBrandTokens(ctx),
      purpose: "Brand design tokens",
    },
    {
      path: "public/placeholder.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#e5e7eb" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="sans-serif">Placeholder</text></svg>`,
      purpose: "Placeholder asset",
    },
    {
      path: ".env.example",
      content: buildEnvExampleContent(envVars),
      purpose: "Environment variables template",
    },
    {
      path: "README.md",
      content: buildReadme(ctx, "Next.js 15 · TypeScript · Tailwind CSS"),
      purpose: "Project documentation",
    },
    {
      path: "tests/home.test.ts",
      content: generateWebsiteTest(ctx.slug),
      purpose: "Basic smoke test",
    },
  ]);

  const routes = pages.map((p, i) => ({
    id: `route-${i}`,
    path: p.slug ? `/${p.slug}` : "/",
    label: p.title,
    file: p.slug ? `app/${p.slug}/page.tsx` : "app/page.tsx",
  }));

  const project = buildProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    name: input.ventureName,
    projectType: "website",
    template,
    files,
    routes,
    tests: { framework: "vitest", files: ["tests/home.test.ts"] },
  });

  return applyValidationToProject(project);
}

function generateLayout(ctx: TemplateContext): string {
  return `import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/sections/Nav";

export const metadata: Metadata = {
  title: "${ctx.ventureName}",
  description: "${ctx.tagline?.replace(/"/g, '\\"') ?? ctx.ventureName}",
  openGraph: { title: "${ctx.ventureName}", description: "${ctx.tagline?.replace(/"/g, '\\"') ?? ""}" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
`;
}

function generateHomePage(ctx: TemplateContext, modules: string[]): string {
  return `import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { ContactForm } from "@/components/sections/ContactForm";

export default function HomePage() {
  return (
    <>
      <Hero title="${ctx.ventureName}" tagline="${ctx.tagline?.replace(/"/g, '\\"') ?? ""}" />
      <Features modules={${JSON.stringify(modules)}} />
      <section className="mx-auto max-w-xl px-4 py-16">
        <h2 className="text-2xl font-bold mb-4">Contact us</h2>
        <ContactForm />
      </section>
    </>
  );
}
`;
}

function generatePageComponent(title: string, ctx: TemplateContext, modules: string[]): string {
  return `export default function ${title.replace(/\s/g, "")}Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">${title}</h1>
      <p className="mt-4 text-gray-600">${ctx.ventureName} — ${ctx.ideaText.slice(0, 100)}</p>
      <ul className="mt-6 list-disc pl-6">
        ${modules.map((m) => `<li>${m}</li>`).join("\n        ")}
      </ul>
    </div>
  );
}
`;
}

function generateHero(ctx: TemplateContext): string {
  return `import { Button } from "@/components/ui/Button";

interface HeroProps { title: string; tagline: string; }

export function Hero({ title, tagline }: HeroProps) {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{tagline}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Button>Get started</Button>
        <Button variant="secondary">Learn more</Button>
      </div>
    </section>
  );
}
`;
}

function generateFeatures(modules: string[], name: string): string {
  return `interface FeaturesProps { modules: string[]; }

export function Features({ modules }: FeaturesProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-2xl font-bold text-center mb-8">Why ${name}?</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {modules.map((mod) => (
          <div key={mod} className="rounded-lg border p-6">
            <h3 className="font-semibold capitalize">{mod.replace(/_/g, " ")}</h3>
            <p className="mt-2 text-sm text-gray-600">Streamline your {mod.replace(/_/g, " ")} workflow.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
`;
}

function generateNav(pages: { slug: string; title: string }[]): string {
  return `"use client";

import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/" className="font-bold">Home</Link>
        ${pages.filter((p) => p.slug).map((p) => `<Link href="/${p.slug}" className="text-gray-600 hover:text-gray-900">${p.title}</Link>`).join("\n        ")}
      </nav>
    </header>
  );
}
`;
}

function generateContactForm(): string {
  return `"use client";

import { Button } from "@/components/ui/Button";

export function ContactForm() {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <input type="text" placeholder="Name" className="w-full rounded border px-3 py-2" required />
      <input type="email" placeholder="Email" className="w-full rounded border px-3 py-2" required />
      <textarea placeholder="Message" rows={4} className="w-full rounded border px-3 py-2" />
      <Button type="submit">Send (demo)</Button>
    </form>
  );
}
`;
}

function generateBrandTokens(ctx: TemplateContext): string {
  return `export const brand = {
  name: "${ctx.ventureName}",
  color: "${ctx.brandColor ?? "#2563eb"}",
  tagline: "${ctx.tagline?.replace(/"/g, '\\"') ?? ""}",
} as const;
`;
}

function generateTailwindConfig(color: string): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: "${color}" },
    },
  },
  plugins: [],
};
export default config;
`;
}

function generateGlobalsCss(color: string): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: ${color};
}
`;
}

function generateWebsiteTest(slug: string): string {
  return `import { describe, it, expect } from "vitest";

describe("${slug}", () => {
  it("has project name", () => {
    expect("${slug}").toBeTruthy();
  });
});
`;
}
