/** PROGRAM 5370 — Allowed commands for sandbox execution. */

export interface AllowedCommand {
  program: string;
  argsPattern: RegExp;
  label: string;
  phase: "install" | "build" | "dev" | "start" | "test";
}

export const ALLOWED_COMMANDS: AllowedCommand[] = [
  { program: "npm", argsPattern: /^ci(\s|$)/, label: "npm ci", phase: "install" },
  { program: "npm", argsPattern: /^install(\s|$)/, label: "npm install", phase: "install" },
  { program: "npm", argsPattern: /^run\s+(build|dev|start)(\s|$)/, label: "npm run", phase: "build" },
  { program: "npx", argsPattern: /^expo\s+start(\s|$)/, label: "npx expo start", phase: "dev" },
  { program: "node", argsPattern: /^dist\/server\.js$/, label: "node server", phase: "start" },
  { program: "tsx", argsPattern: /^src\/server\.ts$/, label: "tsx dev server", phase: "dev" },
];

const BLOCKED_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/[sfq]/i,
  /\bformat\b/i,
  /\bcurl\b.*\|.*sh/i,
  /\bwget\b/i,
  /\bsudo\b/i,
  /\bchmod\s+777\b/i,
  /\bgit\s+clone\b/i,
  /\bnpm\s+publish\b/i,
  /\bdeploy\b/i,
  /&&/,
  /\|/,
  /;/,
  />/,
  /</,
  /`/,
  /\$\(/,
];

export function isCommandAllowed(program: string, args: string[], declaredTests?: string[]): boolean {
  const prog = program.toLowerCase().replace(/\.cmd$/, "").replace(/\.exe$/, "");
  const argsStr = args.join(" ");

  for (const blocked of BLOCKED_PATTERNS) {
    if (blocked.test(argsStr)) return false;
  }

  if (prog === "npm" && args[0] === "run" && args[1] === "test") {
    const testScript = args.slice(2).join(" ");
    return declaredTests?.some((t) => testScript.includes(t)) ?? false;
  }

  return ALLOWED_COMMANDS.some(
    (cmd) => cmd.program === prog && cmd.argsPattern.test(argsStr)
  );
}

export function resolveNpmCommand(): { program: string; prefix: string[] } {
  if (process.platform === "win32") {
    return { program: "npm.cmd", prefix: [] };
  }
  return { program: "npm", prefix: [] };
}

export function buildAllowedArgv(phase: "install" | "build" | "dev" | "start", port?: number): { program: string; args: string[] } | null {
  const { program } = resolveNpmCommand();

  switch (phase) {
    case "install":
      return { program, args: ["install", "--no-audit", "--no-fund"] };
    case "build":
      return { program, args: ["run", "build"] };
    case "dev":
      return { program, args: port ? ["run", "dev", "--", "-p", String(port), "-H", "127.0.0.1"] : ["run", "dev"] };
    case "start":
      return { program, args: port ? ["run", "start", "--", "-p", String(port), "-H", "127.0.0.1"] : ["run", "start"] };
    default:
      return null;
  }
}
