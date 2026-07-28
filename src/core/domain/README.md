# Domain layer (Program 6010)

Canonical aggregates live in folder modules (`mission/`, `workspace/`, …).

## Program 6020 dependency

Program **6020** application handlers may use thin **compat** models under
`src/core/application/compat-domain/` while progressive migration to these
6010 aggregates completes. Prefer importing from `src/core/domain` for new work.

Do not put React/Next imports in this package.
