# Program 6130 — Portfolio Command Center

Canonical route: `/portfolio/[portfolioId]`.

This module adds a server-first portfolio control panel that reuses Program 6110 portfolio read models and Program 6120 value comparison outputs without loading full per-company dashboards.

Key outcomes:
- Quick portfolio view for 30-second situational awareness.
- Venture grid with operational actions and cross-links.
- Boards for executions, value, resources, risks, approvals, shared assets, and activity.
- Multi-create wizard wired to `CreateVentureBatch`.
