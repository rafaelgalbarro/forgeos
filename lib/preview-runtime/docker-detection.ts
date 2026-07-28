/** PROGRAM 5370 — Docker availability detection. */

import { spawn } from "child_process";
import type { DockerAvailability, IsolationStrategy } from "./types";

export function detectDocker(): Promise<DockerAvailability> {
  return new Promise((resolve) => {
    const proc = spawn("docker", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });

    proc.on("error", () => {
      resolve({
        available: false,
        strategy: "child-process",
        message: "Docker not installed — using child process + temp dir fallback",
      });
    });

    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) {
        resolve({
          available: true,
          version: stdout.trim(),
          strategy: "docker",
          message: `Docker available: ${stdout.trim()}`,
        });
      } else {
        resolve({
          available: false,
          strategy: "child-process",
          message: "Docker command failed — using child process + temp dir fallback",
        });
      }
    });
  });
}

export function resolveIsolationStrategy(docker: DockerAvailability): IsolationStrategy {
  if (docker.available) return "docker";
  return "child-process";
}
