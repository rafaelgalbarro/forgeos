# Rendering Strategy

Server Components are the default. Client components only for interaction.

## Inventory

See `src/core/performance/rendering/component-inventory.ts` for full list.

| Component | Mode | Bundle Cost | Optimization |
|-----------|------|-------------|--------------|
| MissionControlExperience | SERVER | LOW | Shell + streaming sections |
| CompanyCommandCenterView | SERVER | MEDIUM | Per-section Suspense |
| StudioHubView | SERVER | LOW | Manifest only |
| CreationOutputStudioClient | CLIENT | HIGH | Dynamic import, single output |

## Principles

1. Light DTOs on initial paint
2. Server-side queries via composition root
3. Suspense boundaries per section
4. Dynamic imports for heavy client components
5. Pagination on all lists
6. No artifact/file content on page open
