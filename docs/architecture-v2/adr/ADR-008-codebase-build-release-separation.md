# ADR-008 — Codebase / Build / Release Separation

**Status:** Accepted (directional freeze)  
**Date:** 2026-07-24  
**Program:** 6000

## Context

“Build”, “Release”, and “Deployment” are fragmented: BuildContext/DNA (inputs), build-engine queue, code-generation projects, creation-output deliverables, preview sandbox builds, preview-deployment requests, ReleasePackage vs programs.Release vs dual ReleaseRecord, cloud DeploymentSnapshot. There is no single productive `Build`/`Deployment` aggregate in `lib/`.

## Decision

1. Separate concerns along the delivery lineage (Program **6050**):
   - **Codebase** — generated/source tree (`CodeProject` / code-generation)
   - **Build** — executable build instance/inputs (`BuildContext`/`BuildDna` → V2 Build)
   - **Release** — versioned releasable package (`ReleasePackage` preferred for software)
   - **Deployment** — environment placement (preview-deployment vs cloud snapshot — keep distinct)
2. Do not collapse these into one type in `lib/` during freeze.
3. Disambiguate colliding `Release` / `ReleaseRecord` names during delivery-model work — without deleting legacy yet.

## Consequences

- CreationOutput remains deliverable SoT for studio until Output unification.
- Preview deployment stays non-production unless explicitly certified later.
