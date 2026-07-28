# Capability Registry

36 capabilities registered in `lib/capabilities/capability-registry.ts`.

## Categories

| Category | Count | Examples |
|----------|-------|----------|
| development | 8 | `deploy_software`, `create_repository` |
| productivity | 4 | `send_email`, `schedule_meeting` |
| marketing | 2 | `publish_campaign`, `create_ad` |
| research | 2 | `analyze_competitors`, `search_information` |
| business | 4 | `create_invoice`, `sign_contract` |
| analytics | 2 | `analyze_metrics`, `generate_dashboard` |
| project | 2 | `create_project`, `manage_roadmap` |
| venture | 12 | `generate_prd`, `publish_release` |

## Required fields

Each capability includes: `id`, `name`, `category`, `description`, `authorizedDepartments`, `compatibleWorkers`, `compatibleSkills`, `compatibleProviders`, `risk`, `estimatedCost`, `estimatedLatency`, `priority`, `version`, `health`, `status`.

## Multi-skill example

`deploy_software` orchestrates: github → docker → vercel → cloudflare → supabase → slack → knowledge → timeline → memory.
