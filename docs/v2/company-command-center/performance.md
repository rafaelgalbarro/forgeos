# Performance

Server-side query aggregation is executed before rendering `/company/[ventureId]`.

- Initial payload prioritizes header, health, sections, and next actions
- Visual output links and detailed diagnostics stay lightweight
- No client import of repositories, factories, workflow kernel, or composition root
