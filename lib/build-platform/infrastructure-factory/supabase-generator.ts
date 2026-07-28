import type { InfraFactoryInput, SupabaseSpec } from "./types";

export function generateSupabaseSpec(input: InfraFactoryInput): SupabaseSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `supabase-${slug}`,
    adapter: "supabase",
    projectRef: `${slug}-ref-placeholder`,
    region: "eu-west-1",
    authProviders: ["email", "google", "github"],
    tables: [
      {
        name: "profiles",
        rlsEnabled: true,
        policies: ["Users can read own profile", "Users can update own profile"],
      },
      {
        name: "organizations",
        rlsEnabled: true,
        policies: ["Members can read org", "Admins can manage org"],
      },
    ],
    storageBuckets: ["avatars", "documents"],
    edgeFunctions: ["webhook-handler", "scheduled-sync"],
    envKeys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    connectionPlaceholder: "postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
  };
}
