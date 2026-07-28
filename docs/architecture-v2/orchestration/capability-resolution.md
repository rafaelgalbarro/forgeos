# Capability Resolution V2

The kernel requests capabilities by **contract**, never by hard-coded venture logic.

## Contracts

- `GenerateMarketResearch`
- `GenerateBrand`
- `GenerateWebsite`
- `GenerateWebApplication`
- `GenerateMobileApplication`
- `GenerateBackend`
- `GenerateCodebase`
- `BuildCodebase`
- `CreatePreview`
- `DeployRelease`

## Mapping

`CapabilityResolverV2` maps contracts to factory adapters:

| Capability | Adapter |
|------------|---------|
| GenerateMarketResearch | VentureFactoryAdapter |
| GenerateBrand | BrandFactoryAdapter |
| GenerateWebsite | WebsiteFactoryAdapter |
| GenerateWebApplication | ApplicationFactoryAdapter |
| GenerateMobileApplication | MobileFactoryAdapter |
| GenerateBackend | BackendFactoryAdapter |
| GenerateCodebase | CodebaseAdapter |
| BuildCodebase | BuildPipelineAdapter |
| CreatePreview | PreviewRuntimeAdapter |
| DeployRelease | DeploymentAdapter |

Adapters use **dynamic import** of existing `lib/*` modules when `ENABLE_REAL_*` is true; otherwise they return deterministic fixtures/plans. Public factory surfaces stay minimally changed.
