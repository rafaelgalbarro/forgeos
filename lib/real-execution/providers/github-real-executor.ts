/** ForgeOS RC5.3 — GitHub controlled real executor. */

import {
  createGitHubBranch,
  createGitHubPrivateRepo,
  isGitHubConfigured,
  openGitHubPullRequest,
  validateGitHubConnection,
} from "@/lib/connections/github/client";
import { canExecuteProviderReal } from "@/lib/real-build-flow/execution-flags";
import { normalizeProviderResult } from "./provider-result-normalizer";
import type { NormalizedProviderResult } from "./provider-result-normalizer";

export interface GitHubRealExecutionInput {
  ventureId: string;
  ventureName: string;
  ventureSlug: string;
  approved: boolean;
}

export interface GitHubRealExecutionOutput {
  results: NormalizedProviderResult[];
  repoUrl?: string;
  branch?: string;
  prUrl?: string;
  rollbackSteps: string[];
}

function safeRepoName(slug: string): string {
  const stamp = Date.now().toString(36);
  return `forgeos-${slug}-${stamp}`.slice(0, 100).replace(/-+$/, "");
}

export async function executeGitHubControlledReal(
  input: GitHubRealExecutionInput
): Promise<GitHubRealExecutionOutput> {
  const rollbackSteps = [
    "Close initial PR if open",
    "Delete branch forgeos/initial-build if API permits",
    "Archive repository manually in GitHub settings (no auto-delete in RC5.3)",
  ];
  const results: NormalizedProviderResult[] = [];

  if (!canExecuteProviderReal("github") || !input.approved) {
    results.push(
      normalizeProviderResult({
        provider: "github",
        success: true,
        executed: false,
        mode: "dry_run",
        output: "[DRY-RUN] GitHub real execution skipped — flags or approval",
        rollbackSteps,
        warnings: ["ENABLE_REAL_GITHUB_EXECUTION=false or approval pending"],
      })
    );
    return { results, rollbackSteps };
  }

  if (!isGitHubConfigured()) {
    results.push(
      normalizeProviderResult({
        provider: "github",
        success: false,
        executed: false,
        mode: "sandbox",
        output: "GITHUB_TOKEN not configured",
        errors: ["Missing credential"],
        rollbackSteps,
      })
    );
    return { results, rollbackSteps };
  }

  try {
    await validateGitHubConnection();
    const repoName = safeRepoName(input.ventureSlug);
    const repo = await createGitHubPrivateRepo({
      name: repoName,
      description: `ForgeOS venture: ${input.ventureName}`,
      autoInit: true,
    });

    const [owner] = repo.full_name.split("/");
    const branch = "forgeos/initial-build";

    let branchCreated = false;
    try {
      await createGitHubBranch({ owner: owner!, repo: repo.name, branch, from: repo.default_branch });
      branchCreated = true;
    } catch {
      results.push(
        normalizeProviderResult({
          provider: "github",
          success: true,
          executed: true,
          mode: "sandbox",
          output: `Repo created; branch creation skipped: ${branch}`,
          data: { repoUrl: repo.html_url },
          warnings: ["Branch may already exist or default branch differs"],
          rollbackSteps,
        })
      );
    }

    let prUrl: string | undefined;
    if (branchCreated) {
      try {
        const pr = await openGitHubPullRequest({
          owner: owner!,
          repo: repo.name,
          title: `ForgeOS initial build — ${input.ventureName}`,
          head: branch,
          base: repo.default_branch,
        });
        prUrl = pr.html_url;
      } catch {
        results.push(
          normalizeProviderResult({
            provider: "github",
            success: true,
            executed: true,
            mode: "sandbox",
            output: "Repo and branch created; PR creation skipped",
            data: { repoUrl: repo.html_url, branch },
            warnings: ["PR may require commits on branch first"],
            rollbackSteps,
          })
        );
      }
    }

    if (results.length === 0) {
      results.push(
        normalizeProviderResult({
          provider: "github",
          success: true,
          executed: true,
          mode: "sandbox",
          output: `Private repo created: ${repo.html_url}`,
          data: { repoUrl: repo.html_url, branch, prUrl },
          rollbackSteps,
        })
      );
    }

    return {
      results,
      repoUrl: repo.html_url,
      branch,
      prUrl,
      rollbackSteps,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub execution failed";
    results.push(
      normalizeProviderResult({
        provider: "github",
        success: false,
        executed: false,
        mode: "sandbox",
        output: msg,
        errors: [msg],
        rollbackSteps,
      })
    );
    return { results, rollbackSteps };
  }
}
