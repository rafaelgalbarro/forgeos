import type { InfraFactoryInput, VercelSpec } from "./types";

export function generateVercelSpec(input: InfraFactoryInput): VercelSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `vercel-${slug}`,
    projectName: slug,
    adapter: "vercel",
    project: {
      framework: "nextjs",
      buildCommand: "npm run build",
      outputDirectory: ".next",
      installCommand: "npm ci",
      regions: ["cdg1", "iad1"],
    },
    envKeys: [
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SENTRY_DSN",
    ],
    domains: [`${slug}.vercel.app`, `staging.${slug}.vercel.app`],
    previewDeployments: true,
    serverlessFunctions: ["app/api/**", "app/**/route.ts"],
  };
}
