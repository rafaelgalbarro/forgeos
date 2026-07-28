-- ForgeOS schema inicial

create table ideas (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  sector text not null,
  niche text not null,
  solution text not null,
  success_probability integer,
  competitors text,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  idea_id uuid references ideas(id),
  app_type text,
  target_customer text,
  status text default 'draft',
  prd text,
  tech_stack jsonb,
  database_schema text,
  created_at timestamptz default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  agent_name text not null,
  status text default 'pending',
  input jsonb,
  output jsonb,
  created_at timestamptz default now()
);