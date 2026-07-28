# Performance

Applied constraints:
- Server Components default for route rendering.
- Pagination on venture cards (page/pageSize in read-model query).
- No per-card dashboard hydration.
- No heavy value/portfolio engine imports in client components.
- Section rendering split by selected tab to reduce first paint weight.

Target:
- Handle 100 venture cards through paged list without loading 100 full company dashboards.
