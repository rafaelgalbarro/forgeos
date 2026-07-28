/** ForgeOS Real Connections — GitHub API client (server-side only, RC5). */

import { getCredential } from "../security/credential-store";
import { redactObject } from "../security/secret-redaction";
import type { GitHubRepo, GitHubUser } from "./types";

const GITHUB_API = "https://api.github.com";

async function githubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCredential("github");
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function validateGitHubConnection(): Promise<{ user: GitHubUser; repoCount: number }> {
  const user = await githubFetch<GitHubUser>("/user");
  const repos = await githubFetch<GitHubRepo[]>("/user/repos?per_page=1");
  return { user: redactObject(user), repoCount: repos.length };
}

export async function listGitHubRepos(perPage = 10): Promise<GitHubRepo[]> {
  return githubFetch<GitHubRepo[]>(`/user/repos?per_page=${perPage}&sort=updated`);
}

export function isGitHubConfigured(): boolean {
  return Boolean(getCredential("github"));
}

export async function createGitHubPrivateRepo(params: {
  name: string;
  description?: string;
  autoInit?: boolean;
}): Promise<{ name: string; html_url: string; full_name: string; default_branch: string }> {
  return githubFetch("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      private: true,
      description: params.description ?? "ForgeOS controlled real execution (RC5.3)",
      auto_init: params.autoInit ?? true,
    }),
  });
}

export async function createGitHubBranch(params: {
  owner: string;
  repo: string;
  branch: string;
  from?: string;
}): Promise<{ ref: string; sha: string }> {
  const from = params.from ?? "main";
  const baseRef = await githubFetch<{ object: { sha: string } }>(
    `/repos/${params.owner}/${params.repo}/git/ref/heads/${from}`
  );
  return githubFetch(`/repos/${params.owner}/${params.repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${params.branch}`,
      sha: baseRef.object.sha,
    }),
  });
}

export async function openGitHubPullRequest(params: {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base?: string;
  body?: string;
}): Promise<{ html_url: string; number: number }> {
  return githubFetch(`/repos/${params.owner}/${params.repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      head: params.head,
      base: params.base ?? "main",
      body: params.body ?? "ForgeOS RC5.3 initial build PR",
    }),
  });
}
