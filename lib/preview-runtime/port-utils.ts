/** PROGRAM 5370 — Find free port in sandbox range. */

import net from "net";
import { SANDBOX_BIND_HOST, SANDBOX_PORT_MIN, SANDBOX_PORT_MAX } from "./security/network-policy";

export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, SANDBOX_BIND_HOST);
  });
}

export async function findFreePort(start = SANDBOX_PORT_MIN, end = SANDBOX_PORT_MAX): Promise<number> {
  for (let port = start; port <= end; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port in range ${start}-${end}`);
}

export function getUsedSandboxPorts(sandboxes: { port?: number }[]): number[] {
  return sandboxes.map((s) => s.port).filter((p): p is number => p != null);
}
