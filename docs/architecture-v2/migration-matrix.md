# V2 Migration Matrix — PROGRAM 6000

**Date:** 2026-07-24  
**Note:** Recommendations are freeze/migration *plans*, not completed work. Runtime SoT remains `lib/*` until later programs land adapters.

| Sistema actual | Responsabilidad V2 | Mantener | Adaptar | Migrar | Deprecar | Eliminar después | Riesgo | Dependencias |
|----------------|-------------------|----------|---------|--------|----------|------------------|--------|--------------|
| `lib/mission-control` Mission/MissionSession | Canonical Mission + session projection | Session persistence keys, conversation UX | Map UI Mission ↔ V2 Mission | Consumers to application commands (6020) | Coarse vs rich dual MissionEvent (unify) | Nested live-mission duplicate package | **Critical** | live-mission, creation-output, factories |
| `lib/live-mission` (+ nested MC live) | Activity projection / Live Mission view model | UI snapshots, feeds | Split React out of lib; single package | Wire to unified events (6040) | Dual package layout | One of the two trees after adapters | **High** | mission-control cycle |
| `lib/domain/venture` VentureProject | Canonical Venture | Fat document fields until PRD/product split | Mapper → V2 Venture | Status → official venture FSM | Portfolio-only card types as entities | — | **Critical** | persistence bridge, intelligence |
| `lib/workspace` Workspace | Canonical Workspace | Org + ventureIds runtime | Mapper → V2 Workspace/Founder | Auth/workspace service | Conflicting `src` interface stub | Duplicate stub file after merge | **High** | auth, persistence |
| `lib/creation-output` | Canonical Output | PROGRAM 5350 contract | Mapper → V2 Output | Studio CQRS ports | — | — | **High** | multi-output, studio |
| `lib/multi-output` | Delivery planning | Plan/sync logic | Break soft cycle via ports | Under delivery model (6050) | — | — | Medium | creation-output |
| `lib/code-generation` | Canonical Codebase | Generators + ZIP | Mapper → Codebase | Persist via repos not only Map | — | — | Medium | studio/code |
| `lib/build-platform` BuildContext/DNA | Build inputs | Context/DNA repos | Align with V2 Build | Generators consume V2 Build | Duplicate DNA shapes in factories | — | Medium | factories |
| `lib/build-engine` | Build queue projection | CEO queue UX | Facade for UI | — | Direct UI engine calls | — | Medium | ceo-office |
| `lib/preview-runtime` | Preview aggregate | Sandbox FSM | Mapper → V2 Preview | — | — | — | Medium | studio/preview |
| `lib/preview-deployment` | Deployment (preview) | Request/approval flow | Add transition guards; mapper | Cloud deploy separate | Ungoverned status assigns | — | Medium | deployments route |
| `lib/build-platform/release-manager` ReleasePackage | Canonical Release | Package + gates | Mapper; disambiguate programs.Release | — | Duplicate ReleaseRecord names | — | Medium | labs |
| `lib/programs` Release | Program governance release | Keep namespaced | Rename/alias in docs/types | — | Collision with ReleasePackage | — | Low–Med | delivery |
| `lib/runtime/event-bus` | Operational events + V2 envelope wrap | Bus singleton | Envelope adapter (6040) — **no new bus** | Domain events via adapter | Platform stub bus if unused | Platform stub after 6040 | **High** | scheduler, workers |
| `lib/fos/event-bus` | FOS metrics bus | FOS kernel | Bridge to Runtime/V2 or keep isolated | — | Overlap with Runtime venture events | Optional after FOS merge | Medium | fos bridges |
| `lib/runtime/{scheduler,queue,workers,execution,state-machine}` | Orchestration Kernel V2 wrap | Formal transition graphs | Ports for 6030 kernel | Gradual cutover | Legacy `lib/workers` UI statuses | Legacy worker registry | **High** | labs, execution |
| `lib/persistence` | Repository boundaries | Adapters + repos | Make factories/missions use it | Remote providers when real | Direct LS in domains | — | **High** | all SoTs |
| Factory pipelines LS | Factory projects | Pipelines | Route storage through persistence | — | Direct LS + UI LS writes | Direct access paths | Medium | website/mobile/app factory |
| `lib/capabilities` + skills | Capability adapters | Registry/planner | Enforce adapter-only from UI | — | — | — | Medium | labs |
| `lib/ai/providers` | Provider ports | Provider impls | Only via gateway/runtime | — | UI direct provider imports (none found) | — | Medium | ai-runtime |
| `lib/intelligence-layer` Decision | Canonical Decision | Persisted Decision | Mission decisions promote via adapter | — | Ephemeral board/FOS as SoT | — | Medium | decision center |
| `lib/command-center` + `/command-center` | Experience consolidation | Data loaders temporarily | Redirect UX to MC/OS | — | Route as primary | Route after 6060 | Medium | founder legacy |
| `/missions/*`, `/new-app`, `/resultado`, `/build` | Experience redirects | Existing redirects | More aliases as needed | — | Duplicate venture surfaces | After traffic zero | Low | next.config |
| `/lab/*` (52) | Lab harnesses | Labs | Keep out of Core nav | — | Product twins where identical | Optional lab twins | Low | labs hub |
| `src/core/domain/**` | Canonical domain | Stubs/entities as contracts | Complete 6010; do not flip SoT early | App gradually | Incomplete dual files (e.g. workspace.ts vs entity) | Stub-only files after real entities | **Critical** if premature | 6020–6070 |
| `components` engine imports | Presentation purity | Existing until facades | Wrap engines behind facades | Stop new imports | Direct engine imports | After facades | High | freeze rule 5 |

---

## Recommended sequence (post-freeze)

1. **6010** complete canonical domain (no SoT flip).  
2. **6020** command/query ports against domain.  
3. **6030** orchestration kernel wraps runtime (no parallel bus/scheduler).  
4. **6040** unify event envelope + official state machines.  
5. **6050** Artifact/Output/Codebase/Build/Release/Deployment lineage.  
6. **6060** experience consolidation (redirects, not hard deletes).  
7. **6070** legacy adapters + dual-read.  
8. **6080** certification.

**Do not declare Architecture V2 implemented after PROGRAM 6000.**
