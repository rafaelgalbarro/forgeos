/** ForgeOS Real Connections — Supabase types (RC5). */

export interface SupabaseProject {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  status: string;
}

export interface SupabaseSchemaPlan {
  tables: string[];
  migrations: string[];
}
