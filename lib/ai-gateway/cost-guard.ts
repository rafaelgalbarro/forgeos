/** ForgeOS AI Gateway — input cost protection. */

const MAX_INPUT_CHARS = 120_000;
const MAX_PARALLEL_REQUESTS = 3;

let activeRequests = 0;

export interface CostGuardResult {
  system: string;
  user: string;
  warnings: string[];
  truncated: boolean;
}

export function guardInput(system: string, user: string): CostGuardResult {
  const warnings: string[] = [];
  let guardedSystem = system;
  let guardedUser = user;
  let truncated = false;

  const total = system.length + user.length;
  if (total > MAX_INPUT_CHARS) {
    const ratio = MAX_INPUT_CHARS / total;
    const systemBudget = Math.floor(system.length * ratio * 0.3);
    const userBudget = MAX_INPUT_CHARS - systemBudget;

    if (system.length > systemBudget) {
      guardedSystem = `${system.slice(0, systemBudget)}\n\n[Contexto truncado por límite de coste]`;
      truncated = true;
    }
    if (user.length > userBudget) {
      guardedUser = `${user.slice(0, userBudget)}\n\n[Input truncado por límite de coste]`;
      truncated = true;
    }

    warnings.push(
      `Input truncado de ${total} a ~${MAX_INPUT_CHARS} caracteres para control de coste.`
    );
  }

  return { system: guardedSystem, user: guardedUser, warnings, truncated };
}

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (activeRequests >= MAX_PARALLEL_REQUESTS) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  activeRequests += 1;
  try {
    return await fn();
  } finally {
    activeRequests -= 1;
  }
}

export function getMaxParallelRequests(): number {
  return MAX_PARALLEL_REQUESTS;
}
