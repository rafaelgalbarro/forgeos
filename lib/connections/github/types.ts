/** ForgeOS Real Connections — GitHub types (RC5). */

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  type: string;
}

export interface GitHubCreateRepoPayload {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}

export interface GitHubBranchPayload {
  repo: string;
  branch: string;
  from?: string;
}

export interface GitHubPRPayload {
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
}

export interface GitHubCommitPlanPayload {
  repo: string;
  branch: string;
  message: string;
  files: string[];
}
