# Git Integration (Dry-Run)

## Branch Manager

```ts
import { proposeBranch, simulateBranchCreate } from "@/lib/self-evolution";

const branch = proposeBranch(proposal);
// { branchName: "feat/self-evo-optimizar-pipeline-de-build", dryRun: true, simulated: true }

simulateBranchCreate(branch);
// { success: true, message: "SIMULACIÓN: git checkout -b ... (no ejecutado)" }
```

## PR Generator

```ts
import { proposePullRequest, simulatePrCreate } from "@/lib/self-evolution";

const pr = proposePullRequest(proposal, branch);
simulatePrCreate(pr, { githubToken: process.env.GITHUB_TOKEN, approvalFlag: true });
// Siempre dry-run por governance — githubApiCalled: false
```

## Restricciones

- No ejecuta `git commit`, `git merge`, ni llama GitHub API
- `requiresApprovalFlag: true` en todos los PRs propuestos
- Branch base siempre `main` — merge solo tras review humano
